import {
    Essentials, Paragraph, Bold, Italic, Heading, List, Link as CKEditorLink, BlockQuote, 
    Alignment, Image, ImageToolbar, ImageCaption, ImageStyle, ImageUpload, ImageResize, Base64UploadAdapter, Indent, 
    IndentBlock, MediaEmbed, Table, TableToolbar, Undo, Font,
    Strikethrough, Underline, Subscript, Superscript, Code, CodeBlock,
    HorizontalLine, SpecialCharacters, RemoveFormat, Highlight, TodoList, FindAndReplace, SourceEditing
} from 'ckeditor5';

export const editorPlugins = [
    Essentials, Paragraph, Bold, Italic, Heading, List, CKEditorLink, BlockQuote, 
    Alignment, Indent, IndentBlock, Undo, Font,
    Strikethrough, Underline, Subscript, Superscript, Code, CodeBlock,
    HorizontalLine, SpecialCharacters, RemoveFormat,
    Image, ImageToolbar, ImageCaption, ImageStyle, ImageUpload, ImageResize, Base64UploadAdapter, MediaEmbed, Table, TableToolbar,
    Highlight, TodoList, FindAndReplace, SourceEditing
];

export const editorToolbar = [
    'undo', 'redo', '|',
    'heading', '|',
    'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'highlight', '|',
    'fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor', '|',
    'alignment', '|',
    'link', 'uploadImage', 'mediaEmbed', 'insertTable', '|',
    'bulletedList', 'numberedList', 'todoList', 'outdent', 'indent', '|',
    'blockQuote', 'code', 'codeBlock', 'horizontalLine', 'specialCharacters', '|',
    'removeFormat', 'findAndReplace', 'sourceEditing'
];

export const editorConfig = {
    licenseKey: 'GPL',
    plugins: editorPlugins,
    toolbar: {
        items: editorToolbar
    },
    image: {
        toolbar: [
            'imageTextAlternative', 'toggleImageCaption', '|',
            'imageStyle:inline', 'imageStyle:wrapText', 'imageStyle:breakText', '|',
            'resizeImage'
        ]
    },
    table: {
        contentToolbar: [
            'tableColumn', 'tableRow', 'mergeTableCells'
        ]
    }
};
