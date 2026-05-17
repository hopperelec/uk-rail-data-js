import { createWriteStream } from 'fs';
import {CifStreamRecord, NormalIntermediateLocationRecord, PassIntermediateLocationRecord} from './types';

// #region Helpers

/**
 * Pads a string or number with spaces on the right to a given length.
 *
 * @param str The string or number to pad. If undefined, it will be treated as an empty string.
 * @param len The length to pad to.
 * @returns The padded string.
 * @throws Error if the input string is longer than the specified length.
 */
function padEnd(str: string | number | undefined, len: number) {
    if (str === undefined) str = '';
    else if (typeof str === 'number') str = str.toString();
    if (str.length > len) {
        throw new Error(`String "${str}" is too long to fit in ${len} characters.`);
    }
    return str.padEnd(len, ' ');
}

/**
 * Pads a string or number with zeros on the left to a given length.
 *
 * @param str The string or number to pad. If undefined, it will be treated as an empty string.
 * @param len The length to pad to.
 * @returns The padded string.
 * @throws Error if the input string is longer than the specified length.
 */
function padStart(str: string | number | undefined, len: number) {
    if (str === undefined) str = '';
    else if (typeof str === 'number') str = str.toString();
    if (str.length > len) {
        throw new Error(`String "${str}" is too long to fit in ${len} characters.`);
    }
    return str.padStart(len, '0');
}

/**
 * Formats a Temporal.PlainTime object into a string in HHMM format.
 *
 * @param time The Temporal.PlainTime object to format.
 * @returns The time in HHMM format.
 */
function formatHHMM(time?: Temporal.PlainTime) {
    if (!time) return ''.padEnd(4, ' ');
    return padStart(time.hour, 2) + padStart(time.minute, 2);
}

/**
 * Formats a Temporal.PlainTime object into a string in HHMM format, with an optional H if seconds are non-zero.
 *
 * @param time The Temporal.PlainTime object to format.
 * @returns The time in HHMM or HHMM'H' format, depending on whether seconds are zero.
 */
function formatHHMMH(time?: Temporal.PlainTime) {
    if (!time) return ''.padEnd(5, ' ');
    return formatHHMM(time) + (time.second ? 'H' : ' ');
}

/**
 * Formats a set of codes into a fixed-width string for the CIF format.
 *
 * @param codes The set of codes to format.
 * @param codeLength The length of each individual code in the output string.
 * @param maxCodes The maximum number of codes allowed. If the set contains more than this number, an error is thrown.
 * @returns A string containing the formatted codes, padded with spaces to fill the total width.
 * @throws Error if the number of codes exceeds the specified maximum or if any individual code is too long to fit in the specified code length.
 */
function formatCodeSet(codes: Set<string>, codeLength: number, maxCodes: number): string {
    if (codes.size > maxCodes) {
        throw new Error(`Too many codes: ${[...codes].join(', ')}. Maximum is ${maxCodes}.`);
    }
    return padEnd([...codes].sort().map(c => padEnd(c, codeLength)).join(''), codeLength * maxCodes);
}

// #endregion

/**
 * Generates a CIF file from an input stream of CIF records.
 *
 * @param inputStream An async iterable that produces CIF records to be written to the file.
 * @param outputPath The file path where the generated CIF file should be saved.
 * @returns A promise that resolves when the file has been fully written.
 */
export async function generate(inputStream: AsyncIterable<CifStreamRecord>, outputPath: string): Promise<void> {
    const writer = createWriteStream(outputPath);
    const writePromise = new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });

    try {
        for await (const record of inputStream) {
            if ('basicSchedule' in record) {
                const lines: string[] = [];
                const { basicSchedule, extraDetails, originLocation, intermediateLocations, terminatingLocation } = record;

                // BS record
                lines.push(
                    'BS' +
                    padEnd(basicSchedule.transactionType, 1) +
                    padEnd(basicSchedule.trainUID, 6) +
                    padEnd(basicSchedule.dateRunsFrom, 6) +
                    padEnd(basicSchedule.dateRunsTo, 6) +
                    padEnd(basicSchedule.daysRun, 7) +
                    padEnd(basicSchedule.bankHolidayRunning, 1) +
                    padEnd(basicSchedule.trainStatus, 1) +
                    padEnd(basicSchedule.trainCategory, 2) +
                    padEnd(basicSchedule.trainIdentity, 4) +
                    padEnd(basicSchedule.headcode, 4) +
                    '1' + // Course Indicator (deprecated)
                    padEnd(basicSchedule.trainServiceCode, 8) +
                    padEnd(basicSchedule.businessSector, 1) +
                    padEnd(basicSchedule.powerType, 3) +
                    padEnd(basicSchedule.timingLoad, 4) +
                    padEnd(basicSchedule.speed, 3) +
                    formatCodeSet(basicSchedule.operatingCharacteristics, 1, 6) +
                    (basicSchedule.hasFirstClassSeating ? 'B' : 'S') +
                    padEnd(basicSchedule.sleeperAccommodation, 1) +
                    padEnd(basicSchedule.reservationRequirements, 1) +
                    ' ' + // Connection Indicator (deprecated)
                    formatCodeSet(basicSchedule.catering, 1, 4) +
                    formatCodeSet(basicSchedule.serviceBrandCodes, 1, 4) +
                    ' ' + // Spare
                    padEnd(basicSchedule.stpIndicator === 'P' ? ' ' : basicSchedule.stpIndicator, 1)
                );

                // BX record
                if (extraDetails) {
                    lines.push(
                        'BX' +
                        ''.padEnd(4, ' ') + // Traction Class (deprecated)
                        padEnd(extraDetails.uicCode, 5) +
                        padEnd(extraDetails.atocCode, 2) +
                        (extraDetails.applicableTimetableSchedule ? 'Y' : 'N') +
                        ''.padEnd(66, ' ') // Reserved + spare
                    );
                }

                // LO, LI, CR, LT records
                lines.push(
                    'LO' +
                    padEnd(originLocation.location, 8) +
                    formatHHMMH(originLocation.scheduledDepartureTime) +
                    formatHHMM(originLocation.publicDepartureTime) +
                    padEnd(originLocation.platform, 3) +
                    padEnd(originLocation.line, 3) +
                    padEnd(originLocation.engineeringAllowance, 2) +
                    padEnd(originLocation.pathingAllowance, 2) +
                    formatCodeSet(originLocation.activities, 2, 6) +
                    padEnd(originLocation.performanceAllowance, 2) +
                    ''.padEnd(37, ' ')
                );
                for (const li of intermediateLocations) {
                    if(li.changeEnRoute){
                        const cr = li.changeEnRoute;
                        lines.push(
                            'CR' +
                            padEnd(li.location, 8) +
                            padEnd(cr.trainCategory, 2) +
                            padEnd(cr.trainIdentity, 4) +
                            padEnd(cr.headcode, 4) +
                            '1' + // Course Indicator (deprecated)
                            padEnd(cr.trainServiceCode, 8) +
                            padEnd(cr.businessSector, 1) +
                            padEnd(cr.powerType, 3) +
                            padEnd(cr.timingLoad, 4) +
                            padEnd(cr.speed, 3) +
                            formatCodeSet(cr.operatingCharacteristics, 1, 6) +
                            (cr.hasFirstClassSeating ? 'B' : 'S') +
                            padEnd(cr.sleeperAccommodation, 1) +
                            padEnd(cr.reservationRequirements, 1) +
                            ' ' + // Connection Indicator (deprecated)
                            formatCodeSet(cr.catering, 1, 4) +
                            formatCodeSet(cr.serviceBrandCodes, 1, 4) +
                            ''.padEnd(4, ' ') + // Traction class
                            padEnd(cr.uicCode, 5) +
                            ''.padEnd(13, ' ') // Reserved field + spare
                        );
                    }

                    // For type safety, since these are mutually exclusive
                    let scheduledArrivalTime: Temporal.PlainTime | undefined;
                    let scheduledDepartureTime: Temporal.PlainTime | undefined;
                    let scheduledPassTime: Temporal.PlainTime | undefined;
                    let publicArrivalTime: Temporal.PlainTime | undefined;
                    let publicDepartureTime: Temporal.PlainTime | undefined;
                    if ('scheduledPassTime' in li) {
                        const pil = li as PassIntermediateLocationRecord;
                        scheduledPassTime = pil.scheduledPassTime;
                    } else {
                        const nil = li as NormalIntermediateLocationRecord;
                        scheduledArrivalTime = nil.scheduledArrivalTime;
                        scheduledDepartureTime = nil.scheduledDepartureTime;
                        publicArrivalTime = nil.publicArrivalTime;
                        publicDepartureTime = nil.publicDepartureTime;
                    }

                    lines.push(
                        'LI' +
                        padEnd(li.location, 8) +
                        formatHHMMH(scheduledArrivalTime) +
                        formatHHMM(scheduledDepartureTime) +
                        formatHHMMH(scheduledPassTime) +
                        formatHHMMH(publicArrivalTime) +
                        formatHHMM(publicDepartureTime) +
                        padEnd(li.platform, 3) +
                        padEnd(li.line, 3) +
                        padEnd(li.path, 3) +
                        formatCodeSet(li.activities, 2, 6) +
                        padEnd(li.engineeringAllowance, 2) +
                        padEnd(li.pathingAllowance, 2) +
                        padEnd(li.performanceAllowance, 2) +
                        ''.padEnd(20, ' ')
                    );
                }
                lines.push(
                    'LT' +
                    padEnd(terminatingLocation.location, 8) +
                    formatHHMMH(terminatingLocation.scheduledArrivalTime) +
                    formatHHMM(terminatingLocation.publicArrivalTime) +
                    padEnd(terminatingLocation.platform, 3) +
                    padEnd(terminatingLocation.path, 3) +
                    formatCodeSet(terminatingLocation.activities, 2, 6) +
                    ''.padEnd(43, ' ')
                );

                for (const line of lines) {
                    writer.write(line + '\n');
                }
            } else {
                let line = '';
                switch (record.recordType) {
                    case 'HD': // Header
                        line = 'HD' +
                            padEnd(record.fileMainframeIdentity, 20) +

                            // Specification claims date should be in yymmdd format,
                            //  but I've found it in ddmmyy format instead.
                            padStart(record.date.getDate(), 2) +
                            padStart(record.date.getMonth() + 1, 2) +
                            padStart(record.date.getFullYear() % 100, 2) +

                            padStart(record.date.getHours(), 2) +
                            padStart(record.date.getMinutes(), 2) +
                            padEnd(record.currentFileRef, 7) +
                            padEnd(record.lastFileRef, 7) +
                            (record.isUpdate ? 'U' : 'F') +
                            padEnd(record.version, 1) +
                            padEnd(record.userExtractStartDate, 6) +
                            padEnd(record.userExtractEndDate, 6) +
                            ''.padEnd(20, ' ');
                        break;
                    case 'AA': // Association
                        line = 'AA' +
                            padEnd(record.transactionType, 1) +
                            padEnd(record.mainTrainUID, 6) +
                            padEnd(record.associatedTrainUID, 6) +
                            padEnd(record.startDate, 6) +
                            padEnd(record.endDate, 6) +
                            padEnd(record.daysRun, 7) +
                            padEnd(record.category, 2) +
                            padEnd(record.dateIndicator, 1) +
                            padEnd(record.location, 7) +
                            padEnd(record.baseLocationSuffix, 1) +
                            padEnd(record.assocLocationSuffix, 1) +
                            ' ' + // Diagram Type (deprecated)
                            (record.isForPassengerUse ? 'P' : 'O') +
                            ''.padEnd(31, ' ') +
                            padEnd(record.stpIndicator === 'P' ? ' ' : record.stpIndicator, 1);
                        break;
                    case 'TI': // Tiploc Insert
                        line = 'TI' +
                            padEnd(record.tiplocCode, 7) +
                            '  ' + // Capitals ID
                            padStart(record.nalco, 6) +
                            padEnd(record.nlcCheckChar, 1) +
                            padEnd(record.tpsDescription, 26) +
                            padStart(record.stanox, 5) +
                            '    ' + // Post office location code (unused)
                            padEnd(record.crsCode, 3) +
                            padEnd(record.description, 16) +
                            ''.padEnd(8, ' ');
                        break;
                    case 'TA': // Tiploc Amend
                        line = 'TA' +
                            padEnd(record.tiplocCode, 7) +
                            '  ' + // Capitals ID
                            padStart(record.nalco, 6) +
                            padEnd(record.nlcCheckChar, 1) +
                            padEnd(record.tpsDescription, 26) +
                            padStart(record.stanox, 5) +
                            '    ' + // Post office location code (unused)
                            padEnd(record.crsCode, 3) +
                            padEnd(record.description, 16) +
                            padEnd(record.newTiplocCode, 7) +
                            ' ';
                        break;
                    case 'TD': // Tiploc Delete
                        line = 'TD' + padEnd(record.tiplocCode, 7) + ''.padEnd(71, ' ');
                }
                if (line) writer.write(line + '\n');
            }
        }
        // Trailer record
        writer.write('ZZ' + ''.padEnd(78, ' ') + '\n');
    } finally {
        writer.end();
    }

    return writePromise;
}
