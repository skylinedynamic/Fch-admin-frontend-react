// Centralized Query Keys for modules
export const queryKeys = {
  partner: {
    all: ['partner'] as const,
    list: () => [...queryKeys.partner.all, 'list'] as const,
    detail: (id: string | number) => [...queryKeys.partner.all, 'detail', id] as const,
    options: () => [...queryKeys.partner.all, 'options'] as const,
  },
  borrower: {
    all: ['borrower'] as const,
    list: () => [...queryKeys.borrower.all, 'list'] as const,
    detail: (id: string | number) => [...queryKeys.borrower.all, 'detail', id] as const,
  },
  employee: {
    all: ['employee'] as const,
    list: () => [...queryKeys.employee.all, 'list'] as const,
    detail: (id: string | number) => [...queryKeys.employee.all, 'detail', id] as const,
    availableForUser: () => [...queryKeys.employee.all, 'available-for-user'] as const,
  },
  appointment: {
    all: ['appointment'] as const,
    list: () => [...queryKeys.appointment.all, 'list'] as const,
    detail: (id: string | number) => [...queryKeys.appointment.all, 'detail', id] as const,
  },
  contact: {
    all: ['contact'] as const,
    list: () => [...queryKeys.contact.all, 'list'] as const,
    detail: (id: string | number) => [...queryKeys.contact.all, 'detail', id] as const,
  },
  role: {
    all: ['role'] as const,
    list: () => [...queryKeys.role.all, 'list'] as const,
    detail: (id: string | number) => [...queryKeys.role.all, 'detail', id] as const,
    permissionsGrouped: () => [...queryKeys.role.all, 'permissions', 'grouped'] as const,
    // Distinct key for edit pages to avoid reading cached grouped permissions
    permissionsGroupedFresh: () => [...queryKeys.role.all, 'permissions', 'grouped', 'edit'] as const,
  },
  application: {
    all: ['application'] as const,
    list: () => [...queryKeys.application.all, 'list'] as const,
    detail: (id: string | number) => [...queryKeys.application.all, 'detail', id] as const,
    summary: ['summary'] as const,
  },
  //SCRUM-67
  fundingApplication: {
    all: ['fundingApplication'] as const,
    businessInfo: () => [...queryKeys.fundingApplication.all, 'businessInfo'] as const,
    ownershipInfo: () => [...queryKeys.fundingApplication.all, 'ownershipInfo'] as const,
    financialInfo: () => [...queryKeys.fundingApplication.all, 'financialInfo'] as const,
    disclosuresConsent: () => [...queryKeys.fundingApplication.all, 'disclosuresConsent'] as const,
    federalCompliance: () => [...queryKeys.fundingApplication.all, 'federalCompliance'] as const,
    attestation: () => [...queryKeys.fundingApplication.all, 'attestation'] as const,
    documents: (id?: number | string | null) => [...queryKeys.fundingApplication.all, 'documents', ...(id ? [id] : [])] as const,
    fundingRequest: () => [...queryKeys.fundingApplication.all, 'fundingRequest'] as const,
    documentTypes: () => [...queryKeys.fundingApplication.all, 'documentTypes'] as const,
  },
  documents: {
    all: ['documents'] as const,
    list: () => [...queryKeys.documents.all, 'list'] as const,
    types: () => [...queryKeys.documents.all, 'types'] as const,
  },
  agreement: {
    all: ['agreement'] as const,
    detail: (slug: string) => [...queryKeys.agreement.all, 'detail', slug] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (params: object) => [...queryKeys.notifications.lists(), params] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
  },
  settings: {
    all: ['settings'] as const,
    smsConfiguration: () => [...queryKeys.settings.all, 'smsConfiguration'] as const,
    mailConfigurations: () => [...queryKeys.settings.all, 'mailConfigurations'] as const,
    fallbackMailConfiguration: () => [...queryKeys.settings.all, 'fallbackMailConfiguration'] as const,
  },
} as const