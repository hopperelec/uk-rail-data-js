/**
 * A 4-character alphanumeric code representing a berth on the train describer feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/TD_Berths}
 */
export type BerthName = string;

/**
 * A Timing Point Location code (TIPLOC), uniquely identifying a location on the railway network.
 * Details about a location can be derived from its TIPLOC using:
 * - the SCHEDULE, in the form of TIPLOC records (TI, TA, TD),
 * - the BPLAN, in the form of location records (LOC).
 *
 * @see {@link https://wiki.openraildata.com/index.php/TIPLOC}
 */
export type TIPLOC = string;

/**
 * A 5-digit numeric code uniquely identifying a location on the railway network.
 *
 * @see {@link https://wiki.openraildata.com/index.php/STANOX}
 */
export type StanoxCode = `${number}`;

/**
 * UNIX epoch millisecond timestamp as a string
 *
 * @example "1511528234000"
 */
export type UnixEpochMsTimestamp = `${number}`;

/**
 * A 1-2 character alphanumeric code representing a route/line/platform.
 *
 * @example "1", "2A", "UF"
 */
export type Routing = string;
