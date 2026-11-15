import { countries } from './index';

/**
 * Country / State / City picker options for forms that store names (the
 * Lender form, like the employee and contact forms): label and value are the
 * name. Each list follows the one picked before it; it is empty until that
 * one is picked, or for a name it does not know.
 */
export type NameOption = { label: string; value: string };

const named = (names: string[]): NameOption[] => names.map((name) => ({ label: name, value: name }));

const countryNamed = (country?: string | null) => (country ? countries.find((c) => c.name === country) : undefined);

export const countryOptions = (): NameOption[] => named(countries.map((c) => c.name));

export const stateOptions = (country?: string | null): NameOption[] =>
    named((countryNamed(country)?.states ?? []).map((s) => s.name));

export const cityOptions = (country?: string | null, state?: string | null): NameOption[] =>
    named(state ? countryNamed(country)?.states.find((s) => s.name === state)?.cities ?? [] : []);
