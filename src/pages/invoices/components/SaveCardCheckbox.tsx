type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Distinguishes the input when more than one card form is on the page. */
  id?: string;
};

/**
 * "Save card as default payment method". A card used to pay is kept as the
 * payer's default - the card later charges, such as the subscription
 * auto-charge, use - only when this is ticked. Unticked by default.
 */
export default function SaveCardCheckbox({ checked, onChange, disabled = false, id = 'save-card-as-default' }: Props) {
  return (
    <div className="form-check mb-3">
      <input
        className="form-check-input"
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label className="form-check-label" htmlFor={id}>
        Save card as default payment method
      </label>
    </div>
  );
}
