type PartnerId = string | number | null | undefined

/**
 * Whether the signed-in user's partner owns a funding application, and so may
 * edit it. Only that partner edits: the host reads every partner's
 * applications but edits only its own borrowers'. The API enforces the same
 * rule (403); this keeps the edit buttons from being offered at all.
 */
export function ownsApplication(
  user: { partner_id?: PartnerId } | null | undefined,
  applicationPartnerId: PartnerId,
): boolean {
  const userPartnerId = user?.partner_id

  if (userPartnerId === null || userPartnerId === undefined || userPartnerId === '') {
    return false
  }

  if (applicationPartnerId === null || applicationPartnerId === undefined || applicationPartnerId === '') {
    return false
  }

  return String(userPartnerId) === String(applicationPartnerId)
}
