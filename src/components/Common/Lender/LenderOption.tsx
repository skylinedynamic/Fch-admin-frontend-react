import '../../../../assets/css/lender-option.css';

export { lenderOptionParts } from '../../../modules/lender/displayName';

type Props = {
    name: string;
    code?: string | null;
    /** Text after the name, e.g. " (Inactive)". */
    suffix?: string;
    /** The selected value: the code right after the name, not at the far right. */
    inline?: boolean;
    className?: string;
};

/**
 * A lender in a lender dropdown (design A, 2026-11-11): the name on the left,
 * the Lender Code right-aligned in a small grey monospace font - on one line.
 */
export default function LenderOption({ name, code, suffix, inline = false, className = '' }: Props) {
    return (
        <span className={`lender-option${inline ? ' lender-option-inline' : ''}${className ? ` ${className}` : ''}`}>
            <span className="lender-option-name">{name}{suffix}</span>
            {code && <span className="lender-option-code">{code}</span>}
        </span>
    );
}
