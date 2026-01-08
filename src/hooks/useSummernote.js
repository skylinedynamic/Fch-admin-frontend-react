import { useEffect, useRef } from 'react';
import 'summernote/dist/summernote-lite.js';

/**
 * Custom hook for Summernote editor initialization and management
 * @param {string} fieldName - The name of the field (e.g., 'notes', 'description')
 * @param {string} fieldValue - The current value of the field
 * @param {function} onChange - Callback function to handle content changes
 * @param {object} options - Optional configuration overrides
 * @returns {object} - Returns editorRef to be attached to textarea
 */
export const useSummernote = (fieldName, fieldValue, onChange, options = {}) => {
    const editorRef = useRef(null);

    const defaultConfig = {
        height: 200,
        placeholder: 'Enter notes here...',
        dialogsInBody: true,
        toolbar: [
            ['style', ['style']],
            ['font', ['bold', 'underline', 'clear']],
            ['color', ['color']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['table', ['table']],
            ['insert', ['link', 'picture', 'video']],
            ['view', ['fullscreen', 'codeview', 'help']]
        ]
    };

    const config = { ...defaultConfig, ...options };

    // Initialize Summernote
    useEffect(() => {
        let $editor = null;
        const $ = window.$;

        if ($ && editorRef.current) {
            $editor = $(editorRef.current);

            if ($editor.summernote) {
                $editor.summernote({
                    ...config,
                    callbacks: {
                        onChange: (contents) => {
                            onChange({ target: { name: fieldName, value: contents } });
                        }
                    }
                });

                // Set initial content
                if (fieldValue) {
                    $editor.summernote('code', fieldValue);
                }
            }
        }

        return () => {
            if ($editor && $editor.summernote) {
                try {
                    $editor.summernote('destroy');
                } catch (e) {
                    console.error('Error destroying summernote:', e);
                }
            }
        };
    }, []);

    // Update content when fieldValue changes externally (e.g. after fetch)
    useEffect(() => {
        const $ = window.$;
        if ($ && editorRef.current) {
            const $editor = $(editorRef.current);
            if ($editor.summernote) {
                const currentCode = $editor.summernote('code');
                if (currentCode !== (fieldValue || '')) {
                    $editor.summernote('code', fieldValue || '');
                }
            }
        }
    }, [fieldValue]);

    return { editorRef };
};
