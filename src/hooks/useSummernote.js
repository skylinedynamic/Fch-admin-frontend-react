import { useEffect, useRef } from 'react';
import 'summernote/dist/summernote-lite.js';

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
            ['insert', ['link', 'picture', 'video']],
            ['view', ['codeview', 'help']]
        ]
    };

    const config = { ...defaultConfig, ...options };

    // Initialize/Destroy Summernote based on 'enabled' and element presence
    useEffect(() => {
        const $ = window.jQuery || window.$;

        if (!enabled || !editorRef.current) {
            if (isInitialized.current && $ && editorRef.current) {
                try {
                    $(editorRef.current).summernote('destroy');
                } catch (e) { }
            }
            isInitialized.current = false;
            return;
        }

        if (isInitialized.current) return;

        const initEditor = () => {
            const $j = window.jQuery || window.$;
            if ($j && editorRef.current && $j(editorRef.current).summernote) {
                const $editor = $j(editorRef.current);
                // Use the latest value from ref, not the closure value which might be stale
                const initialCode = latestValueRef.current || '';
                
                console.log('[useSummernote] Initializing editor:', { 
                    fieldName, 
                    initialCode, 
                    fieldValue 
                });

                $editor.summernote({
                    ...config,
                    callbacks: {
                        onChange: (contents) => {
                            const normalized = normalize(contents);
                            isInternalChange.current = true;
                            lastContentRef.current = normalized;

                            // Send normalized empty string if applicable
                            onChange({ target: { name: fieldName, value: normalized } });

                            setTimeout(() => {
                                isInternalChange.current = false;
                            }, 150);
                        },
                        onInit: function () {
                            console.log('[useSummernote] Editor initialized for:', fieldName);
                            // Fix for nested modals - only apply if Summernote is inside a modal
                            const parentModal = $j(editorRef.current).closest('.modal');

                            if (parentModal.length > 0) {
                                // Only add listeners if we're inside a modal
                                $j(document).on('show.bs.modal.summernote', '.note-modal', function (e) {
                                    // Temporarily allow overflow on parent modal
                                    parentModal.css('overflow', 'visible');

                                    // Ensure Summernote modal appears above parent
                                    const parentZIndex = parseInt(parentModal.css('z-index')) || 1050;
                                    $j(this).css('z-index', parentZIndex + 10);

                                    // Fix backdrop z-index
                                    setTimeout(() => {
                                        $j('.modal-backdrop').last().css('z-index', parentZIndex + 9);
                                    }, 50);
                                });

                                // Restore parent modal overflow when Summernote modal closes
                                $j(document).on('hidden.bs.modal.summernote', '.note-modal', function (e) {
                                    parentModal.css('overflow', '');
                                });
                            }
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

        initEditor();

        return () => {
            if (isInitialized.current && $ && editorRef.current) {
                try {
                    // Clean up namespaced event listeners
                    $(document).off('.summernote');
                    $(editorRef.current).summernote('destroy');
                } catch (e) { }
            }
            isInitialized.current = false;
        };
    }, [enabled, fieldName]); // Re-init if enabled flag or field name changes

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

    return { editorRef };
};
