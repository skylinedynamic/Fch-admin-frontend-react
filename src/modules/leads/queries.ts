import { useMutation } from '@tanstack/react-query';
import { revealLeadField } from './services';
import type { RevealableLeadField } from './types';

/**
 * Fetches a lead's SSN or EIN in full on its eye button (R3-BUG-004). Not
 * cached: each reveal is a deliberate look, logged by the API.
 */
export const useRevealLeadField = () =>
  useMutation({
    mutationFn: ({ id, field }: { id: string | number; field: RevealableLeadField }) => revealLeadField(id, field),
  });
