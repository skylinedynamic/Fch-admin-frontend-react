import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CommissionPayout } from '../../../modules/commission/types';
import { useProcessPayout } from '../../../modules/commission/queries';
import { PAID_BY_PER_DEAL, PAYOUT_TYPE_COMMISSION } from '../../../config/compensationOptions';
import { formatCurrency } from '../../../utils/helper';
import PayoutModal from '../PayoutModal';

type Props = {
    commissionId: number;
    payout: CommissionPayout;
    currencySymbol: string;
    conversionRate: string;
};

/**
 * Who a commission is paid out to and how much — the same card whoever is
 * paid: the partner whose client it is, or, for a client of the host partner,
 * the user assigned to that client. Make Payment pays it, recording an invoice
 * and a payment, and marks the commission Paid and Completed.
 */
export default function PayoutSection({ commissionId, payout, currencySymbol, conversionRate }: Props) {
    const [paying, setPaying] = useState(false);
    const processPayout = useProcessPayout();

    const money = (value: number | null) => formatCurrency(value, currencySymbol, conversionRate, 2);
    const payee = payout.payee;
    const isPartner = payee?.type === 'partner';
    const payeeLink = payee?.id ? (isPartner ? `/partners/${payee.id}` : `/user-details/${payee.id}`) : null;

    // Why there's nothing to pay, when there isn't.
    const emptyReason = payout.is_paid
        ? payout.amount === null ? 'This commission was marked as paid without a payout.' : null
        : !payee
            ? 'No user is assigned to this client.'
            : isPartner
                ? payout.amount === null ? `${payee.name} has no commission share for this deal.` : null
                : payout.paid_by !== PAID_BY_PER_DEAL
                    ? payout.paid_by
                        ? `${payee.name} is paid by ${payout.paid_by}, not per deal.`
                        : `${payee.name} has no compensation set up.`
                    : payout.amount === null
                        ? `${payee.name} has no commission set for Funding.`
                        : null;

    const makePayment = (paymentMethod: string, note: string) => {
        processPayout.mutate(
            { id: commissionId, payload: { partner_payment_method: paymentMethod, note } },
            {
                onSuccess: () => {
                    toast.success('Payment made successfully');
                    setPaying(false);
                },
                onError: (error: any) => {
                    const errors = error?.response?.data?.errors;
                    toast.error(errors?.payout?.[0] || error?.response?.data?.message || 'Failed to make the payment');
                    setPaying(false);
                },
            }
        );
    };

    return (
        <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center">
                <h5 className="card-title mb-0 d-flex align-items-center flex-grow-1">
                    <i className="ri-hand-coin-line me-2 text-primary"></i>
                    Payout
                </h5>
                {payout.is_paid && (
                    <span className="badge bg-success-subtle text-success fs-12 px-2 py-1" style={{ borderRadius: 0 }}>
                        <i className="ri-checkbox-circle-line align-middle me-1"></i> Paid
                    </span>
                )}
            </div>
            <div className="card-body">
                <p className="text-muted mb-1 fs-12 text-uppercase fw-medium">Payee</p>
                {payee ? (
                    <div className="d-flex align-items-center mb-3">
                        <div className="avatar-xs flex-shrink-0 me-2">
                            <div className="avatar-title bg-light text-primary rounded-circle fs-14">
                                {payee.name?.charAt(0) || 'P'}
                            </div>
                        </div>
                        <div className="flex-grow-1 min-w-0">
                            {payeeLink ? (
                                <Link to={payeeLink} className="fw-medium fs-13 text-primary text-decoration-underline-hover">
                                    {payee.name}
                                </Link>
                            ) : (
                                <span className="fw-medium fs-13">{payee.name}</span>
                            )}
                            <div className="text-muted fs-12 text-truncate">{payee.email}</div>
                        </div>
                    </div>
                ) : (
                    <p className="text-muted fs-13 mb-3">-</p>
                )}

                {emptyReason ? (
                    <div className="text-center text-muted border border-dashed rounded py-3 fs-13">{emptyReason}</div>
                ) : (
                    <>
                        <table className="table table-borderless table-sm mb-0 align-middle fs-13">
                            <tbody>
                                {!payout.is_paid && (
                                    <>
                                        <tr>
                                            <td className="text-muted ps-0">Commission</td>
                                            <td className="text-end pe-0">
                                                {payout.payout_type === PAYOUT_TYPE_COMMISSION
                                                    ? `${payout.rate}% of ${payout.base_label}`
                                                    : 'Flat Amount'}
                                            </td>
                                        </tr>
                                        {payout.payout_type === PAYOUT_TYPE_COMMISSION && (
                                            <tr>
                                                <td className="text-muted ps-0">{payout.base_label}</td>
                                                <td className="text-end pe-0">{money(payout.base_amount)}</td>
                                            </tr>
                                        )}
                                    </>
                                )}
                                {payout.is_paid && (
                                    <>
                                        <tr>
                                            <td className="text-muted ps-0">Paid On</td>
                                            <td className="text-end pe-0">{payout.paid_at}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-muted ps-0">Payment Method</td>
                                            <td className="text-end pe-0">{payout.payment_method || '-'}</td>
                                        </tr>
                                    </>
                                )}
                                <tr className="border-top">
                                    <td className="fw-semibold ps-0 pt-2">Payout Amount</td>
                                    <td className="text-end fw-bold text-success pe-0 pt-2 fs-15">{money(payout.amount)}</td>
                                </tr>
                            </tbody>
                        </table>

                        {!payout.is_paid && (
                            payout.can_pay ? (
                                <button
                                    type="button"
                                    className="btn btn-primary w-100 mt-3"
                                    onClick={() => setPaying(true)}
                                    disabled={processPayout.isPending}
                                >
                                    <i className="ri-wallet-3-line align-middle me-1"></i> Make Payment
                                </button>
                            ) : (
                                <p className="text-muted fs-12 text-center mt-3 mb-0">
                                    Payment can be made once the funding is closed.
                                </p>
                            )
                        )}
                    </>
                )}
            </div>

            <PayoutModal
                show={paying}
                onHide={() => setPaying(false)}
                onConfirm={makePayment}
                loading={processPayout.isPending}
                payout={payout}
                currencySymbol={currencySymbol}
                conversionRate={conversionRate}
            />
        </div>
    );
}
