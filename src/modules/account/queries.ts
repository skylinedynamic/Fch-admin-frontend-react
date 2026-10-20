import { useMutation, useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { readEmailChangeLink, submitEmailChangeLink } from './services'
import type { EmailChangeLinkParams } from './types'

/** What an email-change link is about. Reading it never changes anything. */
export const useEmailChangeLink = (link: EmailChangeLinkParams | null) =>
  useQuery({
    queryKey: link
      ? queryKeys.account.emailChangeLink(link.action, link.user, link.hash, link.query)
      : queryKeys.account.all,
    queryFn: () => readEmailChangeLink(link as EmailChangeLinkParams),
    enabled: !!link,
    retry: false,
    staleTime: Infinity,
  })

/** Confirms (with the password), cancels or undoes the change a link is for. */
export const useSubmitEmailChangeLink = (link: EmailChangeLinkParams | null) =>
  useMutation({
    mutationFn: (password?: string) => submitEmailChangeLink(link as EmailChangeLinkParams, password),
  })
