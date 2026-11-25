import { toLocalYmd } from './dates';

type Constraint = { value?: unknown; matchMode?: string };
type ColumnFilter = { operator?: string; constraints?: Constraint[]; value?: unknown; matchMode?: string };

/**
 * DataTable column filters as the API takes them. A date filter holds a Date,
 * which JSON sends as a UTC ISO string - east of UTC that is the previous day
 * - so each date is sent as the viewer's local "YYYY-MM-DD" (R3-BUG-054).
 * Returns a copy; the table's own filter state is left as it is.
 */
export const toApiColumnFilters = (filters?: Record<string, ColumnFilter> | null): Record<string, any> => {
  if (!filters) return {};

  return Object.fromEntries(
    Object.entries(filters).map(([field, filter]) => [
      field,
      Array.isArray(filter?.constraints)
        ? {
            ...filter,
            constraints: filter.constraints.map((c) =>
              c?.value instanceof Date ? { ...c, value: toLocalYmd(c.value) } : c
            ),
          }
        : filter,
    ])
  );
};
