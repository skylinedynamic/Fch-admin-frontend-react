import { ReactNode } from 'react';

export interface AgreementBlock {
    id: string;
    type: string;
    paletteType?: string;
    content?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontStyle?: string;
    fontFamily?: string;
    textAlign?: string;
    color?: string;
    lineHeight?: number;
    letterSpacing?: number;
    textTransform?: string;
    textDecoration?: string;
    marginTop?: number;
    marginBottom?: number;

    // Parties specific
    partyALabel?: string;
    partyBLabel?: string;
    partyLabelColor?: string;
    partyLabelSize?: number;
    partyLabelWeight?: string | number;
    partyLabelFamily?: string;
    partyLabelAlign?: string;
    partyLabelTransform?: string;
    partyLabelDecoration?: string;
    partyLabelLineHeight?: number;
    partyLabelSpacing?: number;
    partyA?: AgreementBlock[];
    partyB?: AgreementBlock[];

    // Logo specific
    logoSrc?: string | null;
    logoAlign?: string;
    logoWidth?: number;
    logoFullWidth?: boolean;

    // Field specific
    fieldLabel?: string;
    fieldRequired?: boolean;
    fieldPlaceholder?: string;
    spacerHeight?: number;

    // Background/extra
    bgColor?: string;
    bgOpacity?: number;
    borderRadius?: number;
    padding?: number;
}

export interface PaletteItem {
    type: string;
    label: string;
    icon: string;
}

export interface PaletteGroup {
    group: string;
    icon: string;
    items: PaletteItem[];
}

export interface AgreementTemplate {
    blocks: AgreementBlock[];
    pagePad: number;
    docBg: string;
}
