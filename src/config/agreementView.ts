/**
 * View Agreement page (/partners|borrowers/download-agreement/:userId) when
 * there is no signed copy to show (BUG-106).
 */
export const AGREEMENT_VIEW_TEXT = {
    notSignedTitle: 'No signed agreement',
    notSignedBody: "This partner or client hasn't signed an agreement yet.",
    missingTitle: 'Signed agreement not found',
    missingBody:
        'This record is marked as signed, but the signed copy could not be found. Re-sign clears the signed status so they are asked to sign the agreement again.',
    resignButton: 'Re-sign',
    resignDoneTitle: 'Re-sign requested',
    resignDoneBody: 'The signed status was cleared. They will be asked to sign the agreement again the next time they sign in.',
} as const;
