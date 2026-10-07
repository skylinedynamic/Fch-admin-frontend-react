import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendAssistantMessage, fetchAssistantHistory, listAssistantSessions, startNewAssistantSession, fetchAssistantConfig } from '../../../modules/support-chat/services';
import type { ChatAction, ChatBubble } from '../../../modules/support-chat/types';
import { useAuthStore } from '../../../store/auth/authStore';
import { PARTNER_TYPES } from '../../../config/partnerTypeOptions';
import avatarDefault from '../../../../assets/images/users/avatar-1.jpg';
import supportAvatar from '../../../../assets/images/support-avatar.svg';
import '../../../../assets/css/support-chat-widget.css';

/**
 * WLP portal navigation allowlist.
 *
 * The backend sends a "Take Me There" action as { id: 'navigate_<route_key>', path }
 * after resolving it against ITS approved map. No destinations are built into
 * this app: the allowlist is the live map from the config endpoint (managed in
 * Settings > OpenAI Configuration), and it starts empty. A button is rendered,
 * and navigation performed, ONLY when the route_key is in that map AND the path
 * the backend sent equals the path listed there. The destination is always the
 * route_key's own route - never the page the user is currently on, never a
 * default, and never a path taken from model text.
 */
const NO_ROUTES: Record<string, string> = {};

/**
 * How long the opened panel stays up before an "assistant not available"
 * answer closes it: long enough to paint instead of flickering, short enough
 * that nobody starts typing into a chat that is about to disappear.
 */
const HIDE_AFTER_CHECK_MS = 50;

const ACTION_ID_PREFIX = 'navigate_';

/** The approved same-origin path for this action, or null if it is not approved. */
function approvedPath(action: ChatAction, routes: Record<string, string>): string | null {
    if (action.type !== 'navigate' || !action.id.startsWith(ACTION_ID_PREFIX)) return null;
    const path = routes[action.id.slice(ACTION_ID_PREFIX.length)];
    return path && path === action.path ? path : null;
}

function isApprovedAction(action: ChatAction, routes: Record<string, string>): boolean {
    return approvedPath(action, routes) !== null;
}

const ACTION_TOKEN = /\[\[ACTION:([a-z0-9_]+)\]\]/gi;
// Bold ("**text**") or a markdown link ("[label](url)"), matched together so
// one pass handles either wherever it appears. The url branch requires an
// http(s) scheme — approved training links are the only markdown links the
// system prompt produces, but the URL itself is still model-generated text,
// not server-controlled like an action path, so a javascript:/data: URI
// (the classic markdown-link XSS vector) is refused rather than rendered.
const INLINE_MARKDOWN = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

/**
 * Renders the approved system prompt's markdown bold ("**text**") as real
 * <strong> text, and an approved training link ("[title](url)") as a real
 * anchor, instead of showing the literal markdown syntax to the user.
 */
function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    INLINE_MARKDOWN.lastIndex = 0;
    while ((match = INLINE_MARKDOWN.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<React.Fragment key={`${keyPrefix}-t${key++}`}>{text.slice(lastIndex, match.index)}</React.Fragment>);
        }

        if (match[1] !== undefined) {
            parts.push(<strong key={`${keyPrefix}-b${key++}`}>{match[1]}</strong>);
        } else {
            parts.push(
                <a key={`${keyPrefix}-a${key++}`} href={match[3]} target="_blank" rel="noopener noreferrer">
                    {match[2]}
                </a>
            );
        }

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(<React.Fragment key={`${keyPrefix}-t${key++}`}>{text.slice(lastIndex)}</React.Fragment>);
    }

    return parts;
}

// A quoted line ("> text") and a heading line ("## text"), as the agent's
// markdown writes them.
const QUOTE_LINE = /^[ \t]*>[ \t]?(.*)$/;
const HEADING_LINE = /^[ \t]*#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/;

/**
 * Renders one run of reply text. Beyond bold and links it handles the two
 * line-level markdown forms the agent uses, so neither shows as a raw
 * character: consecutive "> " lines become one quoted block, and a "# "
 * heading becomes a bold line.
 */
function renderText(text: string, keyPrefix: string): React.ReactNode[] {
    const blocks: { quote: boolean; lines: string[] }[] = [];

    for (const line of text.split('\n')) {
        const quoted = QUOTE_LINE.exec(line);
        const last = blocks[blocks.length - 1];

        if (quoted) {
            if (last?.quote) last.lines.push(quoted[1]);
            else blocks.push({ quote: true, lines: [quoted[1]] });
            continue;
        }

        const heading = HEADING_LINE.exec(line);
        const plain = heading ? `**${heading[1].replace(/\*\*/g, '')}**` : line;

        if (last && !last.quote) last.lines.push(plain);
        else blocks.push({ quote: false, lines: [plain] });
    }

    return blocks.map((block, index) => {
        const key = `${keyPrefix}-k${index}`;

        if (block.quote) {
            return (
                <span key={key} className="support-chat-quote">
                    {renderInlineMarkdown(block.lines.join('\n'), key)}
                </span>
            );
        }

        // The quoted block breaks the line itself, so the blank lines the
        // agent left around it would only add empty space.
        let body = block.lines.join('\n');
        if (blocks[index - 1]?.quote) body = body.replace(/^\n+/, '');
        if (blocks[index + 1]?.quote) body = body.replace(/\n+$/, '');

        return <React.Fragment key={key}>{renderInlineMarkdown(body, key)}</React.Fragment>;
    });
}

/**
 * Splits an assistant reply on the backend's action placeholder token and
 * renders a native button in its place for every approved action id, then
 * renders markdown bold within the remaining text segments.
 */
function renderReply(content: string, actions: ChatAction[], onNavigate: (path: string) => void, routes: Record<string, string>): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let segmentIndex = 0;

    ACTION_TOKEN.lastIndex = 0;
    while ((match = ACTION_TOKEN.exec(content)) !== null) {
        if (match.index > lastIndex) {
            const segment = content.slice(lastIndex, match.index);
            parts.push(<span key={`seg-${segmentIndex++}`}>{renderText(segment, `txt-${segmentIndex}`)}</span>);
        }

        const action = actions.find((a) => a.id === match![1]);

        if (action && isApprovedAction(action, routes)) {
            parts.push(
                <button
                    key={`btn-${action.id}-${segmentIndex++}`}
                    type="button"
                    className="btn btn-sm btn-primary d-block mt-2 mb-1"
                    onClick={() => onNavigate(approvedPath(action, routes)!)}
                >
                    {action.label}
                </button>
            );
        }

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
        const segment = content.slice(lastIndex);
        parts.push(<span key={`seg-${segmentIndex++}`}>{renderText(segment, `txt-${segmentIndex}`)}</span>);
    }

    return parts;
}

/**
 * The classic two-note "ding" chime used by most live-chat widgets (an
 * ascending major third, e.g. G5 -> C6) for a reply that arrives while the
 * widget is minimized. Synthesized with the Web Audio API rather than a
 * bundled audio file — no binary asset needed, and no third-party sound file
 * copied into this codebase. Wrapped in try/catch because some browsers
 * block audio before any user gesture on the page, and a blocked chime must
 * never break the message itself from arriving.
 */
function playNotificationSound() {
    try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();

        const playTone = (frequency: number, startTime: number, duration: number, peakGain: number) => {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;

            // A quick attack then an exponential decay is what makes a synthesized
            // tone read as a soft "ding" instead of a flat, harsh beep.
            gain.gain.setValueAtTime(0.0001, startTime);
            gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        const now = ctx.currentTime;
        playTone(784, now, 0.35, 0.16); // G5
        playTone(1047, now + 0.09, 0.4, 0.16); // C6, entering just before G5 fades

        const totalDurationMs = 550;
        window.setTimeout(() => ctx.close(), totalDurationMs);
    } catch {
        // Audio isn't available/allowed here — the notification badge still shows.
    }
}

function formatCurrentDateTime(): string {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    const day = now.getDate();
    const year = now.getFullYear();
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${month} ${day}, ${year} ${time}`;
}

function SupportBotAvatar({ size = 26 }: { size?: 26 | 28 | 48 }) {
    return (
        <img
            src={supportAvatar}
            alt="Ask Support"
            className={`flex-shrink-0 shadow-sm support-chat-avatar-${size}`}
        />
    );
}

/**
 * The corner-bracket resize glyph (arrows meeting at two opposite corners) —
 * drawn inline rather than pulled from an icon font, since the two React
 * apps bundle different Remixicon subsets and a name that exists in one
 * (e.g. ri-expand-diagonal-2-line) can silently render as nothing in the
 * other. An inline SVG renders identically everywhere.
 */
function ExpandCollapseIcon({ expanded }: { expanded: boolean }) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {expanded ? (
                <>
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                </>
            ) : (
                <>
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                </>
            )}
        </svg>
    );
}

export default function SupportChatWidget() {
    const navigate = useNavigate();
    const currentUser = useAuthStore((state: any) => state.user);
    const userName = currentUser?.name || currentUser?.first_name || 'there';
    // Approved route_key -> path map served by the backend; empty until it loads.
    const [routes, setRoutes] = useState<Record<string, string>>(NO_ROUTES);
    const [open, setOpen] = useState(false);
    // This chat is for White-Label Partners only. Host users and Certified
    // Partners share this portal, and the signed-in user already says which
    // they are — so for them the widget never renders and never asks the
    // backend anything. The backend enforces the same rule on every call.
    const eligible = !(currentUser?.is_host == 1 || currentUser?.is_host === true)
        && (currentUser?.partner_type === PARTNER_TYPES.WHITE_LABEL || currentUser?.partner?.partner_type === PARTNER_TYPES.WHITE_LABEL);
    // Whether the host has this assistant enabled (with an agent to run).
    // Assumed available so the floating button costs nothing to show: the
    // check happens when the panel is opened, and a "no" hides the whole
    // widget — button included — from that point on.
    const [available, setAvailable] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [messages, setMessages] = useState<ChatBubble[]>([]);
    // Both come from the backend, which writes them from the agent's current
    // instructions on the OpenAI platform. Nothing is built in: until they
    // arrive (or if there are none) the widget shows neither.
    const [welcomeSubtitle, setWelcomeSubtitle] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [startingNew, setStartingNew] = useState(false);
    const sessionIdRef = useRef<string | null>(null);
    const historyLoadedRef = useRef(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    // handleSend's response can resolve after the panel was minimized, so the
    // "am I currently open" check at that point needs the live value, not
    // whatever `open` was when handleSend was called (always true, since the
    // form only renders while open — a plain state read there would be stale).
    const openRef = useRef(open);

    // Keeps the newest message in view — a just-sent message or a fresh
    // reply, and restored history once it loads — instead of leaving the
    // panel scrolled wherever it happened to be.
    useEffect(() => {
        if (!open) return;
        messagesEndRef.current?.scrollIntoView({ block: 'end' });
    }, [open, messages, loadingHistory]);

    useEffect(() => {
        openRef.current = open;
        // Opening the panel is the read receipt — always accurate because
        // it's the same instant the messages actually become visible.
        if (open) setUnreadCount(0);
    }, [open]);

    // The only availability check, and it runs on open — never while the chat
    // sits closed. A partner who never opens the chat costs no request at all,
    // which is the whole reason the page-load check and its background poll
    // were dropped.
    //
    // Re-fetched on every open, not just the first — the backend live-derives
    // the welcome line and suggestions from the agent's current instructions on
    // the OpenAI platform (see SupportAssistantService::widgetIntro()), so an
    // edit to the agent shows up here without a page reload and without any
    // separate save step.
    useEffect(() => {
        if (!open) return;

        let cancelled = false;

        // Given a beat rather than applied inline: the panel the click just
        // opened gets to paint, then goes. Hiding it the instant the answer
        // lands would cancel the open before it ever reached the screen.
        const hide = () => window.setTimeout(() => {
            if (cancelled) return;

            setAvailable(false);
            setOpen(false);
        }, HIDE_AFTER_CHECK_MS);

        // Asked after the opening panel has been committed, not inside the
        // same flush that opens it: the panel paints first, then the answer
        // either fills it in or takes it away.
        const started = window.setTimeout(() => fetchAssistantConfig(true)
            .then((response) => {
                if (cancelled) return;

                // Switched off, or this user may not have it: hide the whole
                // widget — floating button included — and close the panel
                // rather than leave a chat that can only answer placeholders.
                if (!response.data.is_ready) {
                    hide();

                    return;
                }

                setAvailable(true);
                setRoutes(response.data.navigation && !Array.isArray(response.data.navigation) ? response.data.navigation : NO_ROUTES);
                setWelcomeSubtitle(response.data.welcome_subtitle || '');
                setSuggestions(response.data.quick_suggestions || []);
            })
            .catch(() => {
                // The check itself failed, so whether the assistant is there is
                // unknown. Treated as "not available": better a missing button
                // than a chat that errors on every message.
                if (cancelled) return;

                hide();
            }), 0);

        return () => {
            cancelled = true;
            window.clearTimeout(started);
        };
    }, [open]);

    // Restores the caller's own most recent session (server-scoped, not
    // browser storage) the first time the widget is opened, so closing the
    // tab or reloading the page doesn't lose the conversation — it resumes
    // exactly where it left off instead of starting blank.
    useEffect(() => {
        if (!open || historyLoadedRef.current) return;
        historyLoadedRef.current = true;

        (async () => {
            setLoadingHistory(true);
            try {
                const sessions = (await listAssistantSessions()).data;
                const latest = sessions[0];
                if (!latest) return;

                const history = (await fetchAssistantHistory(latest.session_id)).data;
                sessionIdRef.current = latest.session_id;
                setMessages(
                    history
                        .filter((m) => m.role === 'user' || m.role === 'assistant')
                        .map((m) => ({
                            id: m.message_id,
                            role: m.role as 'user' | 'assistant',
                            content: m.content,
                            actions: m.actions,
                            createdAt: m.created_at,
                        }))
                );
            } catch (error) {
                // No prior session, or it couldn't be loaded — the widget just starts fresh.
            } finally {
                setLoadingHistory(false);
            }
        })();
    }, [open]);

    const handleNavigate = (path: string) => {
        setOpen(false);
        navigate(path);
    };

    const handleStartNewConversation = async () => {
        if (startingNew) return;
        setStartingNew(true);
        try {
            const response = await startNewAssistantSession();
            sessionIdRef.current = response.data.session_id;
            setMessages([]);
        } catch (error) {
            // The old conversation is left as-is; the next message will just resume it.
        } finally {
            setStartingNew(false);
        }
    };

    const submitMessage = async (rawText: string) => {
        const text = rawText.trim();
        if (!text || sending) return;

        setMessages((prev) => [
            ...prev,
            {
                id: `local-${Date.now()}`,
                role: 'user',
                content: text,
                actions: [],
                createdAt: formatCurrentDateTime(),
            },
        ]);
        setInput('');
        setSending(true);

        try {
            const response = await sendAssistantMessage({
                session_id: sessionIdRef.current,
                message: text,
            });

            sessionIdRef.current = response.data.session_id;
            setMessages((prev) => [
                ...prev,
                {
                    id: response.data.message_id,
                    role: 'assistant',
                    content: response.data.answer,
                    actions: response.data.actions,
                    createdAt: response.data.created_at,
                },
            ]);

            if (!openRef.current) {
                setUnreadCount((count) => count + 1);
                playNotificationSound();
            }
        } catch (error: any) {
            const errorMessage =
                error?.response?.data?.message ||
                error?.response?.data?.errors?.message ||
                (typeof error?.response?.data?.errors === 'string' ? error?.response?.data?.errors : null) ||
                'Sorry, something went wrong. Please try again.';
            setMessages((prev) => [
                ...prev,
                {
                    id: `local-${Date.now()}`,
                    role: 'assistant',
                    content: errorMessage,
                    actions: [],
                    createdAt: formatCurrentDateTime(),
                },
            ]);
        } finally {
            setSending(false);
        }
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        submitMessage(input);
    };

    const handleSuggestionClick = (suggestionText: string) => {
        submitMessage(suggestionText);
    };

    // Not a White-Label Partner, or disabled in Settings (or no agent saved): no chat at all.
    if (!eligible || !available) return null;

    return (
        <>
            {!open && (
                <button
                    type="button"
                    className="btn btn-primary rounded-circle shadow d-flex align-items-center justify-content-center support-chat-launcher"
                    onClick={() => setOpen(true)}
                    aria-label="Open Ask Support"
                >
                    <i className="ri-question-answer-line fs-22 text-white"></i>
                    {unreadCount > 0 && (
                        <span className="support-chat-unread-badge support-chat-launcher-badge badge bg-danger rounded-pill">
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            {open && (
                <div className={`card shadow-lg support-chat-panel${expanded ? ' expanded' : ''}`}>
                    <div className="card-header bg-primary text-white py-3 px-3 d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                            <SupportBotAvatar size={26} />
                            <span className="fw-semibold fs-14">Ask Support</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <button
                                type="button"
                                className="btn btn-sm text-white py-0 px-2 d-flex align-items-center gap-1 support-chat-new-session-btn"
                                onClick={handleStartNewConversation}
                                disabled={startingNew || (messages.length === 0 && !loadingHistory)}
                                aria-label="Start new conversation"
                                title="Start New Session"
                            >
                                {startingNew ? (
                                    <span className="spinner-border spinner-border-sm support-chat-spinner-sm" />
                                ) : (
                                    <i className="ri-add-line fs-13"></i>
                                )}
                                <span>New Session</span>
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-link text-white p-0 d-flex align-items-center justify-content-center support-chat-icon-btn-26"
                                onClick={() => setExpanded((prev) => !prev)}
                                aria-label={expanded ? 'Collapse Ask Support' : 'Expand Ask Support'}
                                title={expanded ? 'Collapse' : 'Expand'}
                            >
                                <ExpandCollapseIcon expanded={expanded} />
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-link text-white p-0 d-flex align-items-center justify-content-center support-chat-icon-btn-26"
                                onClick={() => setOpen(false)}
                                aria-label="Minimize Ask Support"
                                title="Minimize"
                            >
                                <i className="ri-subtract-line fs-18"></i>
                            </button>
                        </div>
                    </div>
                    <div className="card-body p-3 support-chat-body">
                        {(loadingHistory || startingNew) ? (
                            <div className="d-flex flex-column gap-3 py-2">
                                <div className="d-flex align-items-start gap-2">
                                    <div className="support-chat-skeleton rounded-circle flex-shrink-0 support-chat-icon-btn-26" />
                                    <div className="d-flex flex-column gap-2 support-chat-skeleton-w-70">
                                        <div className="support-chat-skeleton support-chat-skeleton-line support-chat-skeleton-w-90" />
                                        <div className="support-chat-skeleton support-chat-skeleton-line support-chat-skeleton-w-60" />
                                    </div>
                                </div>
                                <div className="d-flex align-items-start gap-2 justify-content-end">
                                    <div className="d-flex flex-column align-items-end gap-2 support-chat-skeleton-w-60">
                                        <div className="support-chat-skeleton support-chat-skeleton-line support-chat-skeleton-w-100" />
                                        <div className="support-chat-skeleton support-chat-skeleton-line support-chat-skeleton-w-50" />
                                    </div>
                                    <div className="support-chat-skeleton rounded-circle flex-shrink-0 support-chat-icon-btn-26" />
                                </div>
                                <div className="d-flex align-items-start gap-2">
                                    <div className="support-chat-skeleton rounded-circle flex-shrink-0 support-chat-icon-btn-26" />
                                    <div className="d-flex flex-column gap-2 support-chat-skeleton-w-65">
                                        <div className="support-chat-skeleton support-chat-skeleton-line support-chat-skeleton-w-100" />
                                        <div className="support-chat-skeleton support-chat-skeleton-line support-chat-skeleton-w-40" />
                                    </div>
                                </div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="d-flex flex-column h-100 justify-content-between">
                                <div className="p-3 text-white rounded-3 shadow-sm support-chat-welcome-card">
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        <SupportBotAvatar size={48} />
                                        <div>
                                            <div className="fw-bold fs-15 text-white">Hello {userName},</div>
                                            <div className="fs-12 text-white-50">Welcome to our live chat!</div>
                                        </div>
                                    </div>
                                    {welcomeSubtitle && (
                                        <p className="fs-12 mb-0 text-white support-chat-welcome-subtitle">
                                            {welcomeSubtitle}
                                        </p>
                                    )}
                                </div>

                                {suggestions.length > 0 && (
                                <div className="d-flex flex-column gap-2 my-auto pt-2">
                                    <span className="text-muted fs-11 fw-semibold text-uppercase px-1 support-chat-suggestions-label">
                                        Suggested Questions
                                    </span>
                                    {suggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            className="btn btn-sm text-start py-2 px-3 border d-flex align-items-center justify-content-between support-chat-suggestion-btn"
                                            onClick={() => handleSuggestionClick(suggestion)}
                                        >
                                            <span>{suggestion}</span>
                                            <i className="ri-arrow-right-s-line text-muted fs-14"></i>
                                        </button>
                                    ))}
                                </div>
                                )}
                            </div>
                        ) : (
                            messages.map((m) => (
                                <div
                                    key={m.id}
                                    className={`mb-3 d-flex align-items-start gap-2 ${m.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
                                >
                                    {m.role === 'assistant' && (
                                        <SupportBotAvatar size={28} />
                                    )}
                                    <div
                                        className={`d-flex flex-column support-chat-message-content ${m.role === 'user' ? 'align-end' : 'align-start'}`}
                                    >
                                        <div
                                            className={`px-3 py-2 rounded-3 fs-13 support-chat-bubble ${m.role === 'user' ? 'bg-primary text-white' : 'bg-light text-dark'
                                                }`}
                                        >
                                            {m.role === 'assistant' ? renderReply(m.content, m.actions, handleNavigate, routes) : m.content}
                                        </div>
                                        {m.createdAt && (
                                            <div className="text-muted fs-11 mt-1">{m.createdAt}</div>
                                        )}
                                    </div>
                                    {m.role === 'user' && (
                                        <div className="flex-shrink-0 support-chat-avatar-wrap-28">
                                            <img
                                                src={currentUser?.image || avatarDefault}
                                                alt=""
                                                className="shadow-sm support-chat-avatar-28"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        {sending && <p className="text-muted fs-12 mb-0">Thinking…</p>}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSend} className="border-top p-2 px-3 d-flex align-items-center gap-2 bg-white">
                        <input
                            type="text"
                            className="form-control support-chat-input"
                            placeholder="Type a message…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm support-chat-send-btn"
                            disabled={sending || !input.trim()}
                            aria-label="Send message"
                        >
                            <i className="ri-send-plane-2-fill fs-15"></i>
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
