import * as readline from 'readline';
import {
    CifData, BasicScheduleRecord,
    ChangeEnRouteRecord,
    TrainSchedule, CifStreamRecord, PowerType, TrainCharacteristics,
    AssociationCategory, IntermediateLocationRecord, OriginLocationRecord, TerminusLocationRecord, TiplocRecordBase,
    DaysRun,
} from './types';
import {getAssociationKey, getScheduleKey} from "../utils";
import {createReadStream} from "fs";
import {newDateUk} from "../../../utils";
import {fetchCIF, ScheduleNrodCredentials, ScheduleType} from "../index";
import {Readable} from "node:stream";

// #region Helpers

/**
 * Type guard that validates that a transaction type is one of the expected values and returns it if valid.
 *
 * @param type The transaction type to validate.
 * @throws Error if the transaction type is invalid.
 * @returns The validated transaction type.
 */
function validateTransactionType(type: string): 'N' | 'D' | 'R' {
    if (type !== 'N' && type !== 'D' && type !== 'R') {
        throw new Error(`Invalid Transaction Type '${type}'. Expected 'N', 'D', or 'R'.`);
    }
    return type;
}

/**
 * Type guard that validates that an STP indicator is one of the expected values and returns it if valid.
 *
 * @param indicator The STP indicator to validate.
 * @throws Error if the STP indicator is invalid.
 * @returns The validated STP indicator.
 */
function validateStpIndicator(indicator: string): 'P' | 'O' | 'N' | 'C' {
    if (indicator !== 'P' && indicator !== 'O' && indicator !== 'N' && indicator !== 'C') {
        throw new Error(`Invalid STP Indicator '${indicator}'. Expected 'P', 'O', 'N', or 'C'.`);
    }
    return indicator;
}

/**
 * Parses a time string in HHMM format to a Temporal.PlainTime object.
 *
 * @param time The time string to parse.
 * @returns A Temporal.PlainTime object representing the parsed time.
 */
function parseHHMM(time: string): Temporal.PlainTime {
    return new Temporal.PlainTime(+time.substring(0, 2), +time.substring(2, 4));
}

/**
 * Parses a time string in HHMM or HHMM'H' format (where 'H' indicates a half minute) to a Temporal.PlainTime object.
 *
 * @param time The time string to parse.
 * @returns A Temporal.PlainTime object representing the parsed time.
 */
function parseHHMMH(time: string): Temporal.PlainTime {
    return new Temporal.PlainTime(+time.substring(0, 2), +time.substring(2, 4), time.endsWith('H') ? 30 : 0);
}

/**
 * Parses a time string in HHMM or HHMM'H' format (where 'H' indicates a half minute) to a Temporal.PlainTime object,
 *  or returns undefined if the string is entirely whitespace.
 *
 * @param time The time string to parse.
 * @returns A Temporal.PlainTime object representing the parsed time, or undefined.
 */
export function parseOptionalHHMM(time: string): Temporal.PlainTime | undefined {
    if (!time.trim()) return undefined;
    return parseHHMM(time);
}

/**
 * Parses a time string in HHMM or HHMM'H' format (where 'H' indicates a half minute) to a Temporal.PlainTime object,
 *  or returns undefined if the string is entirely whitespace.
 *
 * @param time The time string to parse.
 * @returns A Temporal.PlainTime object representing the parsed time, or undefined.
 */
function parseOptionalHHMMH(time: string): Temporal.PlainTime | undefined {
    if (!time.trim()) return undefined;
    return parseHHMMH(time);
}

/**
 * Parses the train characteristics from a given line of text, starting at a specified index.
 *
 * @param line The line of text containing the train characteristics.
 * @param startIndex The index at which the train characteristics start in the line.
 * @returns An object representing the parsed train characteristics.
 * @throws Error if any of the parsed values are invalid according to the CIF specification.
 */
function parseTrainCharacteristics(line: string, startIndex: number): TrainCharacteristics {
    function subIndex(start: number, end: number): string {
        return line.substring(startIndex + start, startIndex + end).trim();
    }

    const seatingClass = subIndex(36, 37) || 'B';
    if (seatingClass !== 'B' && seatingClass !== 'S') {
        throw new Error(`Invalid Seating Class '${seatingClass}'. Expected 'B' or 'S'.`);
    }
    return {
        trainCategory: subIndex(0, 2),
        trainIdentity: subIndex(2, 6),
        headcode: subIndex(6, 10) || undefined,
        trainServiceCode: +subIndex(11, 19),
        businessSector: subIndex(19, 20) || undefined,
        powerType: subIndex(20, 23) as PowerType,
        timingLoad: subIndex(23, 27) || undefined,
        speed: +subIndex(27, 30),
        operatingCharacteristics: new Set(subIndex(30, 36).split('').filter(Boolean)),
        hasFirstClassSeating: seatingClass === 'B',
        sleeperAccommodation: subIndex(37, 38) || undefined,
        reservationRequirements: subIndex(38, 39) || undefined,
        catering: new Set(subIndex(40, 44).split('').filter(Boolean)),
        serviceBrandCodes: new Set(subIndex(44, 48).split('').filter(Boolean)),
    }
}

/**
 * Parses the base fields of a TIPLOC record (applicable to both TI and TA record types) from a given line of text.
 *
 * @param line The line of text containing the TIPLOC record.
 * @returns An object containing the base parsed fields of the TIPLOC record.
 * @throws Error if any of the parsed values are invalid according to the CIF specification.
 */
function parseTiplocRecordBase(line: string): TiplocRecordBase {
    return {
        tiplocCode: line.substring(2, 9).trim(),
        nalco: +line.substring(11, 17).trim(),
        nlcCheckChar: line.substring(17, 18).trim(),
        tpsDescription: line.substring(18, 44).trim(),
        stanox: +line.substring(44, 49).trim() || undefined, // Stanox of 0 is treated as undefined
        crsCode: line.substring(53, 56).trim(),
        description: line.substring(56, 72).trim(),
    }
}

/**
 * Extracts individual activity codes from an activity string.
 *
 * @param activity The activity string.
 * @returns A Set of individual activity codes.
 */
export function parseTrainActivities(activity: string): Set<string> {
    const activities = new Set<string>();
    for (let i = 0; i < activity.length; i += 2) {
        const code = activity.substring(i, i + 2).trim();
        if (code) activities.add(code);
    }
    return activities;
}

// #endregion

/**
 * Parses a CIF file from the given path, streaming the file contents in and streaming the records out.
 *
 * Note that this uses the `Temporal` API so, on Node versions prior to 26, a polyfill will be needed.
 *
 * @param fileStream A readable stream for the CIF file
 * @returns An AsyncIterable of CifStreamRecord objects.
 */
export async function* cifStream(fileStream: AsyncIterable<Uint8Array>): AsyncIterable<CifStreamRecord> {
    let currentSchedule: TrainSchedule | null = null;
    let pendingChangeEnRoute: ChangeEnRouteRecord | null = null;
    let encounteredHeader = false;

    for await (const line of readline.createInterface({ input: Readable.from(fileStream) })) {
        if (line.length < 2) continue;
        const recordId = line.substring(0, 2);

        if (!encounteredHeader) {
            if (recordId !== 'HD') {
                throw new Error("First record must be a Header (HD) record.");
            }
            encounteredHeader = true;

            const updateType = line.substring(46, 47);
            if (updateType !== 'U' && updateType !== 'F') {
                throw new Error(`Invalid Update Type '${updateType}'. Expected 'U' or 'F'.`);
            }
            yield {
                recordType: 'HD',
                fileMainframeIdentity: line.substring(2, 22).trim(),
                date: newDateUk(
                    // Specification claims date should be in yymmdd format,
                    //  but I've found it in ddmmyy format instead.
                    2000 + +line.substring(26, 28),
                    +line.substring(24, 26),
                    +line.substring(22, 24),
                    +line.substring(28, 30),
                    +line.substring(30, 32)
                ),
                currentFileRef: line.substring(32, 39).trim(),
                lastFileRef: line.substring(39, 46).trim(),
                isUpdate: updateType === 'U',
                version: line.substring(47, 48).trim(),
                userExtractStartDate: line.substring(48, 54).trim(),
                userExtractEndDate: line.substring(54, 60).trim(),
            };
            continue;
        }

        // If we encounter a new top-level record and have a pending schedule, yield it first.
        if (currentSchedule && ['BS', 'AA', 'TI', 'TA', 'TD', 'ZZ'].includes(recordId)) {
            if (pendingChangeEnRoute) {
                const scheduleKey = getScheduleKey(currentSchedule.basicSchedule);
                console.warn(`Warning: Unapplied 'CR' record at the end of schedule ${scheduleKey}. It will be ignored.`);
                pendingChangeEnRoute = null;
            }
            yield currentSchedule;
            currentSchedule = null;
        }

        switch (recordId) {
            case 'HD': // Header
                throw new Error("Header (HD) record found in the middle of the file. The header should only be the first record.");
            case 'TI': // TIPLOC Insert
                yield {
                    recordType: 'TI',
                    ...parseTiplocRecordBase(line),
                };
                break;
            case 'TA': // TIPLOC Amend
                yield {
                    recordType: 'TA',
                    ...parseTiplocRecordBase(line),
                    newTiplocCode: line.substring(72, 79).trim() || undefined,
                };
                break;
            case 'TD': // TIPLOC Delete
                yield {
                    recordType: 'TD',
                    tiplocCode: line.substring(2, 9).trim(),
                };
                break;
            case 'AA': // Association
                const dateIndicator = line.substring(36, 37).trim() || 'S';
                if (dateIndicator !== 'S' && dateIndicator !== 'N' && dateIndicator !== 'P') {
                    throw new Error(`Invalid Date Indicator '${dateIndicator}'. Expected 'S', 'N', or 'P'.`);
                }
                const associationTypeCode = line.substring(47, 48).trim() || 'O';
                if (associationTypeCode !== 'P' && associationTypeCode !== 'O') {
                    throw new Error(`Invalid Association Type '${associationTypeCode}'. Expected 'P' or 'O'.`);
                }
                const baseLocationSuffixString = line.substring(44, 45).trim();
                const assocLocationSuffixString = line.substring(45, 46).trim();
                yield {
                    recordType: 'AA',
                    transactionType: validateTransactionType(line.substring(2, 3)),
                    mainTrainUID: line.substring(3, 9).trim(),
                    associatedTrainUID: line.substring(9, 15).trim(),
                    startDate: line.substring(15, 21).trim(),
                    endDate: line.substring(21, 27).trim(),
                    daysRun: line.substring(27, 34).trim() as DaysRun,
                    category: line.substring(34, 36).trim() as AssociationCategory,
                    dateIndicator,
                    location: line.substring(37, 44).trim(),
                    baseLocationSuffix: baseLocationSuffixString ? +baseLocationSuffixString : undefined,
                    assocLocationSuffix: assocLocationSuffixString ? +assocLocationSuffixString : undefined,
                    isForPassengerUse: associationTypeCode === 'P',
                    stpIndicator: validateStpIndicator(line.substring(79, 80).trim()),
                };
                break;
            case 'BS': // Basic Schedule
                const seatingClass = line.substring(66, 67).trim() || 'B';
                if (seatingClass !== 'B' && seatingClass !== 'S') {
                    throw new Error(`Invalid Seating Class '${seatingClass}'. Expected 'B' or 'S'.`);
                }
                const bs: BasicScheduleRecord = {
                    recordType: 'BS',
                    transactionType: validateTransactionType(line.substring(2, 3)),
                    trainUID: line.substring(3, 9).trim(),
                    dateRunsFrom: line.substring(9, 15).trim(),
                    dateRunsTo: line.substring(15, 21).trim(),
                    daysRun: line.substring(21, 28).trim() as DaysRun,
                    bankHolidayRunning: line.substring(28, 29).trim() || undefined,
                    trainStatus: line.substring(29, 30).trim(),
                    stpIndicator: validateStpIndicator(line.substring(79, 80).trim()),
                    ...parseTrainCharacteristics(line, 30),
                };
                // A deletion/cancellation is a self-contained record.
                if (bs.transactionType === 'D' || bs.stpIndicator === 'C') {
                    yield {basicSchedule: bs} as unknown as TrainSchedule; // Yield a partial schedule for deletion handling
                } else {
                    currentSchedule = {
                        basicSchedule: bs,
                        originLocation: {} as OriginLocationRecord,
                        intermediateLocations: [],
                        terminatingLocation: {} as TerminusLocationRecord,
                    };
                }
                break;
            case 'BX':
                if (currentSchedule) {
                    const atsCode = line.substring(13, 14);
                    if (atsCode !== 'Y' && atsCode !== 'N') {
                        throw new Error(`Invalid ATS code '${atsCode}'. Expected 'Y' or 'N'.`);
                    }
                    const uicCodeString = line.substring(6, 11).trim();
                    currentSchedule.extraDetails = {
                        uicCode: uicCodeString ? +uicCodeString : undefined,
                        atocCode: line.substring(11, 13).trim(),
                        applicableTimetableSchedule: atsCode === 'Y',
                    };
                } else console.warn("Warning: 'BX' record encountered without a preceding 'BS' record. It will be ignored.");
                break;
            case 'LO': // Location - Origin
                if (currentSchedule) {
                    currentSchedule.originLocation = {
                        location: line.substring(2, 10).trim(),
                        scheduledDepartureTime: parseHHMMH(line.substring(10, 15)),
                        publicDepartureTime: parseHHMM(line.substring(15, 19)),
                        platform: line.substring(19, 22).trim() || undefined,
                        line: line.substring(22, 25).trim() || undefined,
                        engineeringAllowance: line.substring(25, 27).trim() || undefined,
                        pathingAllowance: line.substring(27, 29).trim() || undefined,
                        activities: parseTrainActivities(line.substring(29, 41).trim()),
                        performanceAllowance: line.substring(41, 43).trim() || undefined,
                    };
                } else console.warn("Warning: 'LO' record encountered without a preceding 'BS' record. It will be ignored.");
                break;
            case 'LI': // Location - Intermediate
                if (currentSchedule) {
                    const li: Omit<IntermediateLocationRecord, "recordType"> = {
                        location: line.substring(2, 10).trim(),

                        // @ts-ignore
                        scheduledArrivalTime: parseOptionalHHMMH(line.substring(10, 15)),
                        scheduledDepartureTime: parseOptionalHHMMH(line.substring(15, 20)),
                        scheduledPassTime: parseOptionalHHMMH(line.substring(20, 25)),
                        publicArrivalTime: parseOptionalHHMM( line.substring(25, 29)),
                        publicDepartureTime: parseOptionalHHMM(line.substring(29, 33)),

                        platform: line.substring(33, 36).trim() || undefined,
                        line: line.substring(36, 39).trim() || undefined,
                        path: line.substring(39, 42).trim() || undefined,
                        activities: parseTrainActivities(line.substring(42, 54)),
                        engineeringAllowance: line.substring(54, 56).trim() || undefined,
                        pathingAllowance: line.substring(56, 58).trim() || undefined,
                        performanceAllowance: line.substring(58, 60).trim() || undefined,
                    };
                    if (pendingChangeEnRoute) {
                        const { recordType, location, ...changeEnRoute } = pendingChangeEnRoute;
                        li.changeEnRoute = changeEnRoute;
                        pendingChangeEnRoute = null;
                    }
                    currentSchedule.intermediateLocations.push(li);
                } else console.warn("Warning: 'LI' record encountered without a preceding 'BS' record. It will be ignored.");
                break;
            case 'CR': // Change En Route
                pendingChangeEnRoute = {
                    recordType: 'CR',
                    location: line.substring(2, 10).trim(),
                    uicCode: +line.substring(62, 67).trim() || undefined,
                    ...parseTrainCharacteristics(line, 10),
                };
                break;
            case 'LT': // Location - Terminating
                if (currentSchedule) {
                    currentSchedule.terminatingLocation = {
                        location: line.substring(2, 10).trim(),
                        scheduledArrivalTime: parseHHMMH(line.substring(10, 15)),
                        publicArrivalTime: parseHHMM(line.substring(15, 19)),
                        platform: line.substring(19, 22).trim() || undefined,
                        path: line.substring(22, 25).trim() || undefined,
                        activities: parseTrainActivities(line.substring(25, 37).trim()),
                    };
                } else console.warn("Warning: 'LT' record encountered without a preceding 'BS' record. It will be ignored.");
                break;
            case 'TN': // Train Name (deprecated)
            case 'LN': // Link (deprecated)
                console.warn(`Warning: Encountered deprecated record type '${recordId}'. It will be ignored.`);
                break;
            case 'ZZ': // Trailer
                return;
            default:
                console.warn(`Warning: Encountered unknown record type '${recordId}'. It will be ignored.`);
                break;
        }
    }
    throw new Error("CIF file is incomplete or invalid: missing Trailer (ZZ) record.");
}

/**
 * Creates a CIF stream from a file path.
 *
 * Note that this uses the `Temporal` API so, on Node versions prior to 26, a polyfill will be needed.
 *
 * @param path The path to the CIF file.
 * @returns An AsyncIterable of CifStreamRecord objects.
 */
export function cifStreamFromPath(path: string): AsyncIterable<CifStreamRecord> {
    return cifStream(createReadStream(path));
}

/**
 * Fetches a CIF file from the Network Rail Open Data API and creates a stream of its records.
 *
 * Note that this uses the `Temporal` API so, on Node versions prior to 26, a polyfill will be needed.
 *
 * @param credentials The credentials to use for the request.
 * @param type The type of schedule to request.
 * @param fetch An optional fetch function to use for making the HTTP request. Defaults to the global fetch.
 * @returns An AsyncIterable of CifStreamRecord objects.
 * @throws Error if the HTTP request fails or the response body is not a valid CIF file.
 */
export async function cifStreamFromNROD(
    credentials: ScheduleNrodCredentials,
    type: ScheduleType,
    fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<AsyncIterable<CifStreamRecord>> {
    const response = await fetchCIF(credentials, type, fetch);
    if (!response.ok) throw new Error(`Failed to fetch CIF file: ${response.status} ${response.statusText}`);
    const fileStream = response.body;
    if (!fileStream) throw new Error("Response does not contain a body stream.");
    return cifStream(fileStream.pipeThrough(new DecompressionStream('gzip')));
}

/**
 * Consumes a CIF file and returns the entire dataset as a single object.
 *
 * Note that this uses the `Temporal` API so, on Node versions prior to 26, a polyfill will be needed.
 *
 * @param stream An AsyncIterable of CifStreamRecord objects.
 * @returns A promise that resolves with the complete CifData object.
 */
export async function consumeCifStream(stream: AsyncIterable<CifStreamRecord>): Promise<CifData> {
    const data: CifData = {
        // @ts-ignore This will be initialised before being returned, or an error will be thrown.
        header: null,
        schedules: new Map(),
        associations: new Map(),
        tiplocChanges: { inserts: [], amends: [], deletes: [] }
    };

    for await (const record of stream) {
        if ('basicSchedule' in record) { // It's a TrainSchedule
            const schedule = record as TrainSchedule;
            const key = getScheduleKey(schedule.basicSchedule);
            if (schedule.basicSchedule.transactionType === 'D' || schedule.basicSchedule.stpIndicator === 'C') {
                data.schedules.delete(key);
            } else {
                data.schedules.set(key, schedule);
            }
        } else {
            switch (record.recordType) {
                case 'HD':
                    data.header = record;
                    break;
                case 'AA':
                    const key = getAssociationKey(record);
                    if (record.transactionType === 'D') {
                        data.associations.delete(key);
                    } else {
                        data.associations.set(key, record);
                    }
                    break;
                case 'TI':
                    data.tiplocChanges.inserts.push(record);
                    break;
                case 'TA':
                    data.tiplocChanges.amends.push(record);
                    break;
                case 'TD':
                    data.tiplocChanges.deletes.push(record);
                    break;
            }
        }
    }

    return data;
}

/**
 * Parses a time string in the format "hhmm" or "hhmmH" (where 'H' indicates a half minute) into a number of minutes after midnight.
 *
 * @param time The time string to parse.
 * @returns The number of minutes after midnight represented by the time string.
 */
export function parseScheduleTime(time: string): number {
    return +time.substring(0, 2) * 60 + // hours
        +time.substring(2, 4) + // minutes
        (time.endsWith('H') ? 0.5 : 0); // half minutes
}
