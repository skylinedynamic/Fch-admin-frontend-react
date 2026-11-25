import type { ColumnFilterElementTemplateOptions } from 'primereact/column';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';

/** Column filter input for an amount: a plain number, compared by the menu's match mode. */
export const AmountFilterInput = (options: ColumnFilterElementTemplateOptions) => (
  <InputNumber
    value={options.value ?? null}
    onChange={(e) => options.filterCallback(e.value, options.index)}
    mode="decimal"
    minFractionDigits={0}
    maxFractionDigits={2}
    min={0}
    placeholder="Search amount"
    className="w-100"
  />
);

/** Column filter input for a date: one calendar day. */
export const DateFilterInput = (options: ColumnFilterElementTemplateOptions) => (
  <Calendar
    value={options.value ?? null}
    onChange={(e) => options.filterCallback(e.value, options.index)}
    dateFormat="dd M yy"
    placeholder="Select date"
    className="w-100"
  />
);
