import { RefObject } from 'react';

export interface UseSummernoteOptions {
    height?: number;
    placeholder?: string;
    dialogsInBody?: boolean;
    toolbar?: any[][];
}

export interface UseSummernoteReturn {
    editorRef: RefObject<HTMLTextAreaElement>;
}

export function useSummernote(
    fieldName: string,
    fieldValue: string | undefined,
    onChange: (e: { target: { name: string; value: string } }) => void,
    options?: UseSummernoteOptions
): UseSummernoteReturn;
