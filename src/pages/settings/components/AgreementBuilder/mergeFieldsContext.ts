import { createContext } from 'react';
import { AGREEMENT_MERGE_FIELDS, type AgreementMergeField } from '../../../../config/agreementMergeFields';

/**
 * The dynamic values the builder offers for the agreement being edited: the
 * fixed signer / company / date fields, plus the Plan & Fee values the API
 * lists for that agreement type (useAgreementMergeFields). The Insert Dynamic
 * Value menu, the chip menu and the preview read it.
 */
export const MergeFieldsContext = createContext<AgreementMergeField[]>(AGREEMENT_MERGE_FIELDS);
