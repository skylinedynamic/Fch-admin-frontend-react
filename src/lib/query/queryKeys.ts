// Centralized Query Keys for modules
export const queryKeys = {
  partner: {
    all: ['partner'] as const,
    list: () => [...queryKeys.partner.all, 'list'] as const,
    detail: (id: string | number) => [...queryKeys.partner.all, 'detail', id] as const,
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
  },
  appointment: {
    all: ['appointment'] as const,
    list: () => [...queryKeys.appointment.all, 'list'] as const,
    detail: (id: string | number) => [...queryKeys.appointment.all, 'detail', id] as const,
  },
  role: {
    all: ['role'] as const,
    list: () => [...queryKeys.role.all, 'list'] as const,
    detail: (id: string | number) => [...queryKeys.role.all, 'detail', id] as const,
    permissionsGrouped: () => [...queryKeys.role.all, 'permissions', 'grouped'] as const,
    // Distinct key for edit pages to avoid reading cached grouped permissions
    permissionsGroupedFresh: () => [...queryKeys.role.all, 'permissions', 'grouped', 'edit'] as const,
  },
} as const