/**
 * The Success Fee a funding application can close with, as fch-api takes it
 * (SaveCommissionRequest: numeric, decimal:0,2, 1-100): 1% to 100%, to the
 * hundredth. A third decimal used to be stored rounded, so the commission the
 * admin confirmed was not the one saved (R2 BUG-079).
 */
export const SUCCESS_FEE_MIN = 1;
export const SUCCESS_FEE_MAX = 100;
export const SUCCESS_FEE_DECIMALS = 2;

export const SUCCESS_FEE_RANGE_MESSAGE = 'Success fee must be between 1% and 100%.';
export const SUCCESS_FEE_DECIMALS_MESSAGE = 'Success fee can have at most 2 decimal places.';

/**
 * Why a typed Success Fee cannot be used, or '' when it can. An empty fee is
 * fine: it means no commission is set at closing.
 */
export function successFeeError(value: string): string {
    const typed = value.trim();
    if (typed === '') return '';

    if (!/^-?\d+(\.\d+)?$/.test(typed)) return SUCCESS_FEE_RANGE_MESSAGE;

    const rate = Number(typed);
    if (rate < SUCCESS_FEE_MIN || rate > SUCCESS_FEE_MAX) return SUCCESS_FEE_RANGE_MESSAGE;

    // 12.350 is 12.35: only digits that change the value count.
    const decimals = (typed.split('.')[1] ?? '').replace(/0+$/, '');
    if (decimals.length > SUCCESS_FEE_DECIMALS) return SUCCESS_FEE_DECIMALS_MESSAGE;

    return '';
}
