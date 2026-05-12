import * as readline from 'readline';
import { BplanData, BplanStreamRecord, CycleType, Direction, ForceLpb, ReversibleLine, TimingPointType } from './types';
import {newDateUk} from "../../utils";

// #region Helpers

/**
 * Parses a BPLAN date string in 'DD-MM-YYYY HH:MM:SS' format.
 *
 * @param dateStr The string to parse.
 * @returns A Date object.
 */
function parseDate(dateStr: string): Date {
    const parts = dateStr.split(' ');
    if (parts.length !== 2) {
        throw new Error(`Invalid date format. Expected 'DATE TIME', but received '${dateStr}'.`);
    }
    const [datePart, timePart] = parts;

    const dateComponents = datePart.split('-');
    if (dateComponents.length !== 3) {
        throw new Error(`Invalid date part format. Expected 'DD-MM-YYYY', but received '${datePart}'.`);
    }

    const timeComponents = timePart.split(':');
    if (timeComponents.length !== 3) {
        throw new Error(`Invalid time part format. Expected 'HH:MM:SS', but received '${timePart}'.`);
    }

    const [day, month, year] = dateComponents.map(Number);
    const [hour, minute, second] = timeComponents.map(Number);
    if ([day, month, year, hour, minute, second].some(isNaN)) {
        throw new Error(`Invalid date component. Ensure all parts are numbers in '${dateStr}'.`);
    }

    try {
        return newDateUk(year, month - 1, day, hour, minute, second)
    } catch (error) {
        throw new Error(`Invalid date value in '${dateStr}': ${error}`);
    }
}

/**
 * Parses an optional BPLAN date string. Returns undefined if the string is empty.
 *
 * @param dateStr The string to parse.
 * @returns A Date object or undefined.
 */
function parseOptionalDate(dateStr: string): Date | undefined {
    if (dateStr) return parseDate(dateStr);
}

/**
 * Parses an optional number string. Returns undefined if the string is empty.
 *
 * @param numStr The string to parse.
 * @returns A number or undefined.
 */
function parseOptionalNumber(numStr: string): number | undefined {
    if (numStr) return +numStr;
}

/**
 * Parses an optional Y/N boolean string. Returns undefined if the string is empty.
 *
 * @param boolStr The string to parse.
 * @returns A boolean or undefined.
 */
function parseOptionalBoolean(boolStr: string): boolean | undefined {
    if (boolStr === 'Y') return true;
    if (boolStr === 'N') return false;
}

/**
 * Type guard that validates an action code is 'A' (Add).
 *
 * The BPLAN specification allows for 'C' (Change) and 'D' (Delete) action codes,
 *  but this parser only supports 'A' (Add) records.
 *
 * @param code The action code to validate.
 * @param recordType The type of record being validated (for error messages).
 * @throws Error if the code is not 'A'.
 * @returns The validated action code ('A').
 */
function validateActionCode(code: string, recordType: string): 'A' {
    if (code !== 'A') {
        throw new Error(`Invalid Action Code '${code}' for ${recordType} record. This parser only supports 'A' (Add) records.`);
    }
    return code;
}

// #endregion

/**
 * Parses a BPLAN file from the given path, streaming the file contents and yielding parsed records.
 *
 * @param fileStream A readable stream for the CIF file
 * @returns An AsyncIterable of BplanStreamRecord objects.
 */
export async function* bplanStream(fileStream: NodeJS.ReadableStream): AsyncIterable<BplanStreamRecord> {
    const rl = readline.createInterface({ input: fileStream });

    let encounteredHeader = false;

    for await (const line of rl) {
        if (!line.trim()) continue;

        const fields = line.split('\t').map(field => field.trim());
        const recordType = fields[0];

        if (!encounteredHeader) {
            if (recordType !== 'PIF') {
                throw new Error("First record in a BPLAN file must be a PIF (Header) record.");
            }
            encounteredHeader = true;

            const cycleType = fields[6];
            if (cycleType !== 'I' && cycleType !== 'S') {
                throw new Error(`Invalid Cycle Type '${cycleType}'. Expected 'I' or 'S'.`);
            }
            yield {
                recordType: 'PIF',
                fileVersion: fields[1],
                sourceSystem: fields[2],
                tocId: fields[3],
                timetableStartDate: parseDate(fields[4]),
                timetableEndDate: parseDate(fields[5]),
                cycleType: cycleType as CycleType,
                cycleStage: fields[7],
                fileCreationDate: parseDate(fields[8]),
                fileSequenceNumber: +fields[9],
            };
            continue;
        }

        switch (recordType) {
            case 'PIF': { // Header
                throw new Error("Header (PIF) record found in the middle of the file. The header should only be the first record.");
            }
            case 'REF': { // Reference
                validateActionCode(fields[1], 'REF');
                yield {
                    recordType: 'REF',
                    referenceCodeType: fields[2],
                    referenceCode: fields[3],
                    description: fields[4],
                };
                break;
            }
            case 'TLD': { // Timing Load
                validateActionCode(fields[1], 'TLD');
                yield {
                    recordType: 'TLD',
                    tractionType: fields[2],
                    trailingLoad: fields[3].trim(),
                    speed: fields[4],
                    raGauge: fields[5].trim(),
                    description: fields[6],
                    itpsPowerType: fields[7],
                    itpsLoad: fields[8].trim(),
                    limitingSpeed: fields[9],
                };
                break;
            }
            case 'LOC': { // Location
                validateActionCode(fields[1], 'LOC');
                const timingPointType = fields[8] as TimingPointType;
                if (!['T', 'M', 'O'].includes(timingPointType)) {
                    throw new Error(`Invalid Timing Point Type '${timingPointType}'. Expected 'T', 'M', or 'O'.`);
                }
                const offNetwork = fields[11];
                if (offNetwork !== 'Y' && offNetwork !== 'N') {
                    throw new Error(`Invalid Off-Network Indicator '${offNetwork}'. Expected 'Y' or 'N'.`);
                }
                const forceLpb = fields[12] as ForceLpb | '';
                if (!['L', 'P', 'B', ''].includes(forceLpb)) {
                    throw new Error(`Invalid Force LPB value '${forceLpb}'.`);
                }

                yield {
                    recordType: 'LOC',
                    locationCode: fields[2],
                    locationName: fields[3],
                    startDate: parseDate(fields[4]),
                    endDate: parseOptionalDate(fields[5]),
                    osEasting: parseOptionalNumber(fields[6]),
                    osNorthing: parseOptionalNumber(fields[7]),
                    timingPointType: timingPointType,
                    zone: fields[9],
                    stanoxCode: parseOptionalNumber(fields[10]),
                    isOffNetwork: offNetwork === 'Y',
                    forceLpb: forceLpb || undefined,
                };
                break;
            }
            case 'PLT': { // Platform
                validateActionCode(fields[1], 'PLT');
                yield {
                    recordType: 'PLT',
                    locationCode: fields[2],
                    platformId: fields[3],
                    startDate: parseDate(fields[4]),
                    endDate: parseOptionalDate(fields[5]),
                    length: parseOptionalNumber(fields[6]),
                    powerSupplyType: fields[7].trim(),
                    dooPassenger: parseOptionalBoolean(fields[8]),
                    dooNonPassenger: parseOptionalBoolean(fields[9]),
                };
                break;
            }
            case 'NWK': { // Network Link
                validateActionCode(fields[1], 'NWK');
                const initialDirection = fields[8] as Direction;
                if (!['U', 'D'].includes(initialDirection)) {
                    throw new Error(`Invalid Initial Direction '${initialDirection}'. Expected 'U' or 'D'.`);
                }
                const finalDirection = fields[9] as Direction | '';
                if (!['U', 'D', ''].includes(finalDirection)) {
                    throw new Error(`Invalid Final Direction '${finalDirection}'. Expected 'U', 'D', or empty.`);
                }
                const reversibleLine = fields[15] as ReversibleLine;
                if (!['B', 'R', 'N'].includes(reversibleLine)) {
                    throw new Error(`Invalid Reversible Line code '${reversibleLine}'. Expected 'B', 'R', or 'N'.`);
                }

                yield {
                    recordType: 'NWK',
                    originLocation: fields[2],
                    destinationLocation: fields[3],
                    runningLineCode: fields[4],
                    runningLineDescription: fields[5] || undefined,
                    startDate: parseDate(fields[6]),
                    endDate: parseOptionalDate(fields[7]),
                    initialDirection: initialDirection,
                    finalDirection: finalDirection as Direction || undefined,
                    distance: parseOptionalNumber(fields[10]),
                    dooPassenger: parseOptionalBoolean(fields[11]),
                    dooNonPassenger: parseOptionalBoolean(fields[12]),
                    isRetb: parseOptionalBoolean(fields[13]),
                    zone: fields[14],
                    reversibleLine: reversibleLine,
                    powerSupplyType: fields[16].trim(),
                    routeAvailability: fields[17],
                    maxTrainLength: parseOptionalNumber(fields[18]),
                };
                break;
            }
            case 'TLK': { // Timing Link
                validateActionCode(fields[1], 'TLK');
                yield {
                    recordType: 'TLK',
                    originLocation: fields[2],
                    destinationLocation: fields[3],
                    runningLineCode: fields[4],
                    tractionType: fields[5],
                    trailingLoad: fields[6].trim(),
                    speed: fields[7],
                    raGauge: fields[8].trim(),
                    entrySpeed: +fields[9],
                    exitSpeed: +fields[10],
                    startDate: parseDate(fields[11]),
                    endDate: parseOptionalDate(fields[12]),
                    sectionalRunningTime: fields[13],
                    description: fields[14] || undefined,
                };
                break;
            }
            case 'PIT': { // Trailer
                const recordCounts = new Map<string, { additions: number; changes: number; deletes: number; }>();
                for (let i = 1; i < fields.length; i += 4) {
                    const recordTypeCode = fields[i];
                    if (!recordTypeCode) continue;
                    recordCounts.set(recordTypeCode, {
                        additions: +fields[i+1],
                        changes: +fields[i+2],
                        deletes: +fields[i+3],
                    });
                }
                yield {
                    recordType: 'PIT',
                    recordCounts: recordCounts,
                };
                // Trailer record is the last one in the file.
                return;
            }
            default:
                console.warn(`Warning: Encountered unknown BPLAN record type '${recordType}'. It will be ignored.`);
                break;
        }
    }
}

/**
 * Consumes a BPLAN file stream and returns the entire dataset as a single object.
 *
 * @param stream An AsyncIterable of BplanStreamRecord objects.
 * @returns A promise that resolves with the complete BplanData object.
 */
export async function consumeBplanStream(stream: AsyncIterable<BplanStreamRecord>): Promise<BplanData> {
    const data: BplanData = {
        // @ts-ignore This will be initialised before being returned, or an error will be thrown.
        header: null,
        references: new Map(),
        timingLoads: [],
        locations: new Map(),
        platforms: [],
        networkLinks: [],
        timingLinks: [],
        // @ts-ignore This will be initialised before being returned, or an error will be thrown.
        footer: null,
    };

    let headerFound = false;

    for await (const record of stream) {
        if (!headerFound && record.recordType !== 'PIF') {
            throw new Error("First record in a BPLAN stream must be a PIF (Header) record.");
        }

        switch (record.recordType) {
            case 'PIF':
                data.header = record;
                headerFound = true;
                break;
            case 'REF':
                if (!data.references.has(record.referenceCodeType)) {
                    data.references.set(record.referenceCodeType, new Map());
                }
                data.references.get(record.referenceCodeType)!.set(record.referenceCode, record);
                break;
            case 'TLD':
                data.timingLoads.push(record);
                break;
            case 'LOC':
                data.locations.set(record.locationCode, record);
                break;
            case 'PLT':
                data.platforms.push(record);
                break;
            case 'NWK':
                data.networkLinks.push(record);
                break;
            case 'TLK':
                data.timingLinks.push(record);
                break;
            case 'PIT':
                data.footer = record;
                break;
        }
    }

    if (!data.header) {
        throw new Error("BPLAN data is incomplete: missing Header (PIF) record.");
    }
    if (!data.footer) {
        throw new Error("BPLAN data is incomplete: missing Footer (PIT) record.");
    }

    const DATA_KEY_MAP: Record<string, keyof BplanData> = {
        'REF': 'references',
        'TLD': 'timingLoads',
        'LOC': 'locations',
        'PLT': 'platforms',
        'NWK': 'networkLinks',
        'TLK': 'timingLinks',
    } as const;

    for (const [recordType, counts] of data.footer.recordCounts) {
        const dataKey = DATA_KEY_MAP[recordType];
        if (dataKey) {
            let actualCount: number;
            if (recordType === 'REF') {
                actualCount = 0;
                for (const innerMap of (data[dataKey] as BplanData['references']).values()) {
                    actualCount += innerMap.size;
                }
            } else {
                actualCount = Array.isArray(data[dataKey])
                    ? (data[dataKey] as any[]).length
                    : (data[dataKey] as Map<any, any>).size;
            }
            if (actualCount !== counts.additions) {
                throw new Error(`Record count mismatch for type '${recordType}': expected ${counts.additions}, found ${actualCount}.`);
            }
        } else {
            console.warn(`Warning: Footer contains counts for unknown record type '${recordType}'.`);
        }
    }

    return data;
}