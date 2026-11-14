type Props = {
  /** The user who paid, by their current name, from the API (BUG-202). */
  name?: string | null;
};

/**
 * Who paid the payment - for a partner's invoice, often one of its staff rather
 * than the owner. Not shown for a payment from before this was recorded.
 */
export default function PaidByInfo({ name }: Props) {
  if (!name) return null;

  return (
    <div className="row m-0 mb-4">
      <div className="col-lg-3 col-sm-6 px-3">
        <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Paid By</p>
        <h5 className="fs-14 mb-0">{name}</h5>
      </div>
    </div>
  );
}
