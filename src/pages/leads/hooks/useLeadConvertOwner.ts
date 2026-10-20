import { useRef, useState } from 'react';
import type { Lead, LeadConvertAs, LeadConvertAsOption } from '../../../modules/leads/types';

/**
 * The host converting another partner's borrower lead first picks whose
 * borrower it becomes. `chooseOwnerThen` runs the convert flow straight away
 * for any other lead, or once an owner is picked; `withConvertAs` adds that
 * pick to the convert payload.
 */
export function useLeadConvertOwner() {
    const [options, setOptions] = useState<LeadConvertAsOption[]>([]);
    const [show, setShow] = useState(false);
    const [convertAs, setConvertAs] = useState<LeadConvertAs | null>(null);
    const pendingRef = useRef<(() => void) | null>(null);

    const chooseOwnerThen = (lead: Pick<Lead, 'convert_as_options'> | null | undefined, next: () => void) => {
        setConvertAs(null);
        const leadOptions = lead?.convert_as_options ?? [];
        if (leadOptions.length === 0) {
            next();
            return;
        }
        setOptions(leadOptions);
        pendingRef.current = next;
        setShow(true);
    };

    const onSelect = (value: LeadConvertAs) => {
        setConvertAs(value);
        setShow(false);
        const next = pendingRef.current;
        pendingRef.current = null;
        next?.();
    };

    const onHide = () => {
        pendingRef.current = null;
        setShow(false);
    };

    const withConvertAs = <T extends object>(payload: T): T | (T & { convert_as: LeadConvertAs }) =>
        convertAs ? { ...payload, convert_as: convertAs } : payload;

    return {
        ownerModalProps: { show, options, onSelect, onHide },
        chooseOwnerThen,
        withConvertAs,
    };
}
