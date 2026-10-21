import { useRef, useState } from 'react';
import type { Lead } from '../../../modules/leads/types';

/**
 * The host converting another partner's borrower lead is first told it does
 * so on that partner's behalf. `confirmOwnerThen` runs the convert flow
 * straight away for any other lead, or once the host continues.
 */
export function useLeadConvertOwner() {
    const [show, setShow] = useState(false);
    const pendingRef = useRef<(() => void) | null>(null);

    const confirmOwnerThen = (lead: Pick<Lead, 'convert_on_behalf_of'> | null | undefined, next: () => void) => {
        if (!lead?.convert_on_behalf_of) {
            next();
            return;
        }
        pendingRef.current = next;
        setShow(true);
    };

    const onContinue = () => {
        setShow(false);
        const next = pendingRef.current;
        pendingRef.current = null;
        next?.();
    };

    const onHide = () => {
        pendingRef.current = null;
        setShow(false);
    };

    return {
        ownerModalProps: { show, onContinue, onHide },
        confirmOwnerThen,
    };
}
