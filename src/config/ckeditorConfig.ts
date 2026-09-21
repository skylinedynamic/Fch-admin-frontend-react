import {
    Essentials, Paragraph, Bold, Italic, Heading, List, ListProperties, TodoList,
    Link as CKEditorLink, LinkImage, AutoLink, BlockQuote, Alignment,
    Image, ImageToolbar, ImageCaption, ImageStyle, ImageUpload, ImageResize, ImageInsert,
    ImageInsertViaUrl, AutoImage, Base64UploadAdapter,
    Indent, IndentBlock, MediaEmbed, HtmlEmbed, GeneralHtmlSupport,
    Table, TableToolbar, TableProperties, TableCellProperties, TableCaption, TableColumnResize,
    Undo, Font, Strikethrough, Underline, Subscript, Superscript, Code, CodeBlock,
    HorizontalLine, PageBreak, SpecialCharacters, SpecialCharactersEssentials, RemoveFormat,
    Highlight, FindAndReplace, SourceEditing, ShowBlocks, WordCount,
    Autoformat, PasteFromOffice, TextTransformation, SelectAll, AccessibilityHelp,
    type EditorConfig
} from 'ckeditor5';

export const editorPlugins = [
    Essentials, Paragraph, Heading, Undo, SelectAll, AccessibilityHelp,

    // Typing comfort: markdown-ish shortcuts, smart quotes, clean Word/Docs paste.
    Autoformat, TextTransformation, PasteFromOffice,

    // Inline formatting
    Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
    Font, Highlight, RemoveFormat, Code,

    // Blocks
    List, ListProperties, TodoList, BlockQuote, CodeBlock,
    Alignment, Indent, IndentBlock, HorizontalLine, PageBreak,
    SpecialCharacters, SpecialCharactersEssentials,

    // Links
    CKEditorLink, AutoLink, LinkImage,

    // Media
    Image, ImageToolbar, ImageCaption, ImageStyle, ImageUpload, ImageResize,
    ImageInsert, ImageInsertViaUrl, AutoImage, Base64UploadAdapter,
    MediaEmbed, HtmlEmbed,

    // Tables
    Table, TableToolbar, TableProperties, TableCellProperties, TableCaption, TableColumnResize,

    // Authoring tools
    FindAndReplace, SourceEditing, ShowBlocks, WordCount,

    // Lets the editor keep any markup pasted or typed in source mode.
    GeneralHtmlSupport
];

export const editorToolbar = [
    'undo', 'redo', '|',
    'heading', '|',
    'fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor', '|',
    'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'highlight', 'removeFormat', '|',
    'bulletedList', 'numberedList', 'todoList', 'outdent', 'indent', 'alignment', '|',
    'link', 'insertImage', 'mediaEmbed', 'insertTable', 'blockQuote', '|',
    'code', 'codeBlock', 'horizontalLine', 'pageBreak', 'specialCharacters', 'htmlEmbed', '|',
    'findAndReplace', 'showBlocks', 'sourceEditing'
];

export const editorConfig: EditorConfig = {
    licenseKey: 'GPL',
    plugins: editorPlugins,
    toolbar: {
        items: editorToolbar,
        // Keep every button reachable: wrap onto more rows instead of hiding
        // the tail of the toolbar behind a "show more" dropdown.
        shouldNotGroupWhenFull: true
    },
    heading: {
        options: [
            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
            { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' },
            { model: 'heading5', view: 'h5', title: 'Heading 5', class: 'ck-heading_heading5' },
            { model: 'heading6', view: 'h6', title: 'Heading 6', class: 'ck-heading_heading6' }
        ]
    },
    fontSize: {
        options: [10, 12, 14, 'default', 18, 20, 24, 28, 32, 40],
        supportAllValues: true
    },
    fontFamily: {
        supportAllValues: true
    },
    list: {
        properties: {
            styles: true,
            startIndex: true,
            reversed: true
        }
    },
    link: {
        addTargetToExternalLinks: true,
        defaultProtocol: 'https://',
        decorators: {
            openInNewTab: {
                mode: 'manual' as const,
                label: 'Open in a new tab',
                attributes: {
                    target: '_blank',
                    rel: 'noopener noreferrer'
                }
            }
        }
    },
    image: {
        insert: {
            type: 'auto' as const,
            integrations: ['upload', 'url']
        },
        // `wrapText` / `breakText` are the grouped alignment dropdowns; they
        // cover inline, left/right wrap and the block alignments.
        toolbar: [
            'toggleImageCaption', 'imageTextAlternative', '|',
            'imageStyle:inline', 'imageStyle:wrapText', 'imageStyle:breakText', '|',
            'resizeImage', 'linkImage'
        ]
    },
    table: {
        contentToolbar: [
            'tableColumn', 'tableRow', 'mergeTableCells', '|',
            'tableProperties', 'tableCellProperties', 'toggleTableCaption'
        ]
    },
    mediaEmbed: {
        // Store the real <iframe> in the saved HTML. Without this CKEditor saves
        // a bare <oembed url="..."> element, which renders as nothing on the
        // public site - the reason embedded videos never showed up.
        previewsInData: true
    },
    htmlSupport: {
        // Authors can paste or hand-write any markup (source editing included)
        // and the editor will preserve it instead of stripping it on save.
        allow: [
            {
                name: /.*/,
                attributes: true,
                classes: true,
                styles: true
            }
        ],
        disallow: [
            { name: 'script' },
            { name: /.*/, attributes: /^on.*/ }
        ]
    },
    htmlEmbed: {
        showPreviews: true
    },
    placeholder: 'Start writing your post... Use the toolbar above, or type "* " for a bullet list, "1. " for a numbered list and "# " for a heading.'
};
