import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { fetchConversionPreview } from './services'

/**
 * What converting the submission would do, read fresh each time the Convert
 * modal opens - a client may have been created since it was last asked.
 */
export const useConversionPreview = (id: number | string | null | undefined, enabled = true) =>
  useQuery({
    queryKey: queryKeys.embedForm.conversionPreview(id ?? ''),
    queryFn: () => fetchConversionPreview(id as number | string),
    enabled: enabled && id != null && id !== '',
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
