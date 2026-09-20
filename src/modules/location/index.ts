import { apiClient } from '../../lib/http/apiClient';

/**
 * Countries, states and cities, served by the API.
 *
 * Replaces the two hardcoded copies this portal used to carry — the keyed tree
 * in src/config/locations.ts and the list in src/data/countries.ts — plus the
 * borrower portal's own. All of them drifted from the server's list; the
 * "Unknown" state and city entries exist only there.
 *
 * Both shapes are exported because the portal's components already read both:
 *
 *   locationData[countryCode].states[stateCode].cities   keyed tree
 *   countries.find(c => c.code === 'USA')                list
 *
 * One fetch fills both. They stay plain mutable values so every call site keeps
 * reading them synchronously, exactly as they read the old constants.
 *
 * IMPORTANT: they are empty until loadLocations() resolves, which main.jsx
 * awaits before the first render. Read them inside a function or a component —
 * never in a module-level initialiser, which runs at import time, before the
 * fetch has even started.
 */

export interface State {
    name: string;
    code: string;
    cities: string[];
}

export interface Country {
    name: string;
    code: string;
    currency: string;
    phone_code: string;
    flag: string;
    states: State[];
}

/** A state in the keyed tree. */
export interface StateOrProvince {
    name: string;
    code?: string;
    cities: string[];
}

export interface StatesMap {
    [stateCode: string]: StateOrProvince;
}

export interface CountryMapEntry extends Omit<Country, 'states'> {
    states: StatesMap;
}

export interface LocationData {
    [countryCode: string]: CountryMapEntry;
}

interface LocationResponse {
    status: boolean;
    message: string;
    data: Country[];
}

/** The list, in the API's canonical order. */
export const countries: Country[] = [];

/** The same data keyed by country code and state code. */
export const locationData: LocationData = {};

let request: Promise<Country[]> | null = null;

/** Build the keyed tree from the canonical list. */
const toMap = (list: Country[]): LocationData => {
    const map: LocationData = {};

    list.forEach((country) => {
        const states: StatesMap = {};

        (country.states ?? []).forEach((state) => {
            const key = state.code || state.name;
            if (key) {
                states[key] = state;
            }
        });

        map[country.code || country.name] = { ...country, states };
    });

    return map;
};

/**
 * Fetch the tree once and fill both exports.
 *
 * Only the canonical list is requested; the keyed tree is derived here, so the
 * two can never disagree and only one round trip is made.
 *
 * Safe to call repeatedly — concurrent callers share one request, and a failure
 * is not cached so the next caller retries.
 */
export const loadLocations = async (): Promise<Country[]> => {
    if (!request) {
        request = apiClient
            .get<LocationResponse>('/common/locations')
            .then((res) => {
                const list = res.data?.data ?? [];

                countries.splice(0, countries.length, ...list);

                Object.keys(locationData).forEach((key) => delete locationData[key]);
                Object.assign(locationData, toMap(list));

                return countries;
            })
            .catch((err) => {
                request = null;
                throw err;
            });
    }

    return request;
};

/** True once the data has arrived. */
export const locationsLoaded = (): boolean => countries.length > 0;

/** Drop the cached request and the loaded data. Only needed by tests. */
export const clearLocationCache = (): void => {
    request = null;
    countries.splice(0, countries.length);
    Object.keys(locationData).forEach((key) => delete locationData[key]);
};
