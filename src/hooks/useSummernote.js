import { useEffect, useRef, useCallback } from 'react';
import 'summernote/dist/summernote-lite.js';

/**
 * Fix: Bootstrap 5 modal has a focus trap that intercepts all `focusin` events
 * and forces focus back inside the modal element. This prevents typing inside
 * Summernote dialogs rendered on <body> (via dialogsInBody: true).
 * We block that interception in capture phase when the focus target is inside
 * a Summernote dialog.
 */
let summernoteDialogFocusTrapFixed = false;
function applySummernoteFocusTrapFix() {
    if (summernoteDialogFocusTrapFixed) return;
    summernoteDialogFocusTrapFixed = true;
    document.addEventListener('focusin', (e) => {
        if (
            e.target.closest('.note-modal') ||
            e.target.closest('.note-modal-backdrop') ||
            e.target.closest('.note-editor-dialog')
        ) {
            e.stopPropagation();
        }
    }, true); // capture phase — runs before Bootstrap's listener
}


/**
 * Custom hook for Summernote editor initialization and management
 * @param {string} fieldName - The name of the field (e.g., 'notes', 'description')
 * @param {string} fieldValue - The current value of the field
 * @param {function} onChange - Callback function to handle content changes
 * @param {object} options - Optional configuration overrides
 * @param {boolean} enabled - Whether the editor should be active (useful for tabs/modals)
 * @returns {object} - Returns editorRef to be attached to textarea or div
 */
export const useSummernote = (fieldName, fieldValue, onChange, options = {}, enabled = true) => {
    const editorRef = useRef(null);
    const isInternalChange = useRef(false);
    const lastContentRef = useRef(fieldValue || '');
    const isInitialized = useRef(false);

    // Keep track of the latest value to handle race conditions during async init
    const latestValueRef = useRef(fieldValue);
    latestValueRef.current = fieldValue;

    // Helper to normalize HTML for comparison (handles <p><br></p>, etc.)
    const normalize = (html) => {
        if (!html) return '';
        const trimmed = html.trim();
        const emptyStates = ['<p><br></p>', '<p><br/></p>', '<br>', '<p>&nbsp;</p>', ''];
        if (emptyStates.includes(trimmed)) return '';
        return trimmed;
    };

    const defaultConfig = {
        height: 200,
        placeholder: 'Enter text here...',
        toolbar: [
            ['style', ['style']],
            ['font', ['bold', 'underline', 'clear']],
            ['color', ['color']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['table', ['table']],
            ['insert', ['link', 'picture']],
            ['view', ['help']]
        ],
        popover: {
            table: [
                ['add', ['addRowDown', 'addRowUp', 'addColLeft', 'addColRight']],
                ['delete', ['deleteRow', 'deleteCol', 'deleteTable']],
            ],
        },
    };

    const config = { ...defaultConfig, ...options };

    const initEditor = () => {
        const $j = window.jQuery || window.$;
        if (!enabled || !editorRef.current || isInitialized.current) return;

        if ($j && editorRef.current && $j(editorRef.current).summernote) {
            const $editor = $j(editorRef.current);
            const initialCode = latestValueRef.current || '';

            // Apply Bootstrap 5 focus trap fix (runs once globally)
            applySummernoteFocusTrapFix();

            console.log('[useSummernote] Initializing editor:', { fieldName });

            $editor.summernote({
                ...config,
                dialogsInBody: true,  // Always render Insert Image/Video dialogs on <body> so they appear above Bootstrap modals
                callbacks: {
                    onChange: (contents) => {
                        const normalized = normalize(contents);
                        isInternalChange.current = true;
                        lastContentRef.current = normalized;
                        onChange({ target: { name: fieldName, value: normalized } });
                        setTimeout(() => { isInternalChange.current = false; }, 150);
                    },
                    onInit: function () {
                        console.log('[useSummernote] Editor initialized for:', fieldName);
                    }
                }
            });

            $editor.summernote('code', initialCode);
            lastContentRef.current = normalize(initialCode);
            isInitialized.current = true;
        } else if ($j && editorRef.current) {
            setTimeout(initEditor, 100);
        }
    };

    const destroyEditor = () => {
        const $ = window.jQuery || window.$;
        if (isInitialized.current && $ && editorRef.current) {
            try {
                $(editorRef.current).summernote('destroy');
            } catch (e) { }
        }
        isInitialized.current = false;
    };

    // Re-initialize when enabled or fieldName changes
    useEffect(() => {
        if (enabled && editorRef.current) {
            initEditor();
        } else {
            destroyEditor();
        }
    }, [enabled, fieldName]);

    // Handle initial mount or ref assignment
    const setRef = useCallback(node => {
        if (node) {
            editorRef.current = node;
            if (enabled) initEditor();
        } else {
            destroyEditor();
            editorRef.current = null;
        }
    }, [enabled, fieldName]);

    // Sync external updates
    useEffect(() => {
        if (isInternalChange.current || !isInitialized.current || !enabled) return;

        const incoming = normalize(fieldValue);
        const currentRef = normalize(lastContentRef.current);

        if (incoming === currentRef) return;

        const $ = window.jQuery || window.$;
        if ($ && editorRef.current) {
            const $editor = $(editorRef.current);
            if ($editor.summernote) {
                const currentEditorCode = normalize($editor.summernote('code'));
                if (currentEditorCode !== incoming) {
                    $editor.summernote('code', fieldValue || '');
                    lastContentRef.current = normalize(fieldValue || '');
                }
            }
        }
    }, [fieldValue, enabled]);

    return { editorRef: setRef };
};
