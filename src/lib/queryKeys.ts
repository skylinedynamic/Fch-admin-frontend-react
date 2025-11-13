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
} as const