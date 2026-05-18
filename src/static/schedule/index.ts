/** Helper type to flatten the unions in ScheduleRequest to make IDEs display the options more clearly. */
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

/**
 * Credentials for requesting the SCHEDULE from Network Rail Open Data.
 *
 * @see {@link https://publicdatafeeds.networkrail.co.uk/}
 * @see {@link https://wiki.openraildata.com/index.php/About_the_Network_Rail_feeds#How_do_I_get_the_data?}
 */
export interface ScheduleNrodCredentials {
    username: string;
    password: string;
    /**
     * The URL to request the SCHEDULE from.
     *
     * @default "https://publicdatafeeds.networkrail.co.uk/ntrod/CifFileAuthenticate"
     */
    url?: string;
}

/** Details of a type of SCHEDULE to request. */
export type ScheduleType = {
    /** Request a full snapshot of the SCHEDULE. */
    type: 'full';
} | {
    /** Request an update file, which only contains changes to the previous day's full SCHEDULE. */
    type: 'update';
    /**
     * Which day of the week (from the past week) to request the update for.
     * 0 = Sunday, 1 = Monday, ..., 6 = Saturday (per `Date.getDay()`)
     *
     * @example
     * If today is Wednesday, then:
     * - 1 would request the last (yesterday's) update file
     * - 2 would request the update file from *last* Wednesday (i.e. the update file from 7 days ago)
     */
    day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

/** Details of the scope of a SCHEDULE to request. */
export type ScheduleScope = {
    /** Request the SCHEDULE for all TOCs. */
    scope: 'all';
    /**
     * Which file format to request the SCHEDULE in.
     *
     * Note that CIF files are only available with *all* TOCs.
     *
     * @see {@link https://wiki.openraildata.com/index.php/JSON_File_Format}
     * @see {@link https://wiki.openraildata.com/index.php/CIF_File_Format}
     */
    format: 'json' | 'cif';
} | {
    /** Request the SCHEDULE for a specific TOC. */
    scope: 'toc';
    /**
     * The "Business Code" of the TOC to request the SCHEDULE for.
     *
     * @example "PK" for Tyne and Wear Metro
     * @see {@link https://wiki.openraildata.com/index.php/TOC_Codes}
     */
    toc: string
} | {
    /** Request the SCHEDULE for freight services. */
    scope: 'freight';
};

/** Details of a SCHEDULE to request. */
export type ScheduleRequest = Prettify<ScheduleScope & ScheduleType>;

/**
 * Requests a SCHEDULE file from Network Rail Open Data.
 *
 * This returns the raw `Response` object and does not parse the response body.
 * If you intend on parsing the file, consider using
 *  `cifStreamFromNROD` (from the cif module) or
 *  `jsonScheduleStreamFromNROD` (from the json module) instead.
 *
 * @param credentials The credentials to use for the request.
 * @param request Details of the SCHEDULE to request.
 * @param fetch The `fetch` function to use for making the request. Defaults to the global `fetch`.
 * @returns A promise that resolves to the raw `Response` from the server.
 */
export async function fetchSchedule(
    credentials: ScheduleNrodCredentials,
    request: ScheduleRequest,
    fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<Response> {
    let scope: string;
    switch (request.scope) {
        case 'all': scope = 'ALL'; break;
        case 'toc': scope = `${request.toc}_TOC`; break;
        case 'freight': scope = 'FREIGHT'; break;
    }

    let dayParam = `toc-${request.type}`;
    if (request.type === 'update') {
        dayParam += `-${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][request.day]}`;
    }
    if (request.scope === 'all' && request.format === 'cif') {
        dayParam += '.CIF.gz';
    }

    const url = new URL(credentials.url || 'https://publicdatafeeds.networkrail.co.uk/ntrod/CifFileAuthenticate');
    url.searchParams.set('type', `CIF_${scope}_${request.type.toUpperCase()}_DAILY`);
    url.searchParams.set('day', dayParam);

    return fetch(url, {
        headers: {
            Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
        },
    });
}

/**
 * Requests a CIF SCHEDULE file from Network Rail Open Data.
 *
 * Note that CIF files are only available with *all* TOCs.
 *
 * This returns the raw `Response` object and does not parse the CIF file.
 * If you intend on parsing the file, consider using `cifStreamFromNROD` from the `cif` module instead.
 *
 * @param credentials The credentials to use for the request.
 * @param type The type of SCHEDULE to request.
 * @param fetch The `fetch` function to use for making the request. Defaults to the global `fetch`.
 * @returns A promise that resolves to the raw `Response` from the server.
 */
export async function fetchCIF(
    credentials: ScheduleNrodCredentials,
    type: ScheduleType,
    fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<Response> {
    return fetchSchedule(credentials, {
        scope: 'all',
        format: 'cif',
        ...type,
    }, fetch);
}
