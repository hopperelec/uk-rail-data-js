import {
    CifStreamRecord,
    TrainSchedule,
    AssociationRecord,
    ScheduleKey,
    AssociationKey,
    TiplocAmendRecord,
} from './types';
import { getScheduleKey, getAssociationKey } from '../utils';
import {TIPLOC} from "../../../types";

/**
 * Merges a 'FULL' stream with an 'UPDATE' stream and returns a new stream with the merged data.
 * The update stream's content takes precedence.
 *
 * @param fullStream An AsyncIterable yielding CifStreamRecord objects from a 'FULL' CIF.
 * @param updateStream An AsyncIterable yielding CifStreamRecord objects from an 'UPDATE' CIF.
 * @returns An AsyncIterable yielding the merged CifStreamRecord objects.
 */
export async function* merge(
    fullStream: AsyncIterable<CifStreamRecord>,
    updateStream: AsyncIterable<CifStreamRecord>
): AsyncIterable<CifStreamRecord> {
    // Changes from the update stream
    const schedulesToUpdate = new Map<ScheduleKey, TrainSchedule>();
    const schedulesToDelete = new Set<ScheduleKey>();
    const associationsToUpdate = new Map<AssociationKey, AssociationRecord>();
    const associationsToDelete = new Set<AssociationKey>();
    const tiplocsToAmend = new Map<TIPLOC, TiplocAmendRecord>();
    const tiplocsToDelete = new Set<TIPLOC>();

    // Consume the update stream. Yield HD and TI immediately and store changes in memory.
    for await (const record of updateStream) {
        if ('basicSchedule' in record) {
            const key = getScheduleKey(record.basicSchedule);
            if (record.basicSchedule.transactionType === 'D' || record.basicSchedule.stpIndicator === 'C') {
                schedulesToDelete.add(key);
                schedulesToUpdate.delete(key); // A delete overrides a previous update in the same stream
            } else {
                schedulesToUpdate.set(key, record);
                schedulesToDelete.delete(key); // An update overrides a previous delete
            }
        } else {
            switch (record.recordType) {
                case 'HD':
                case 'TI':
                    // Yield these immediately; the update stream is the source of truth for them.
                    yield record;
                    break;
                case 'AA':
                    const key = getAssociationKey(record);
                    if (record.transactionType === 'D') {
                        associationsToDelete.add(key);
                        associationsToUpdate.delete(key);
                    } else {
                        associationsToUpdate.set(key, record);
                        associationsToDelete.delete(key);
                    }
                    break;
                case 'TA':
                    tiplocsToAmend.set(record.tiplocCode, record);
                    break;
                case 'TD':
                    tiplocsToDelete.add(record.tiplocCode);
                    break;
            }
        }
    }

    // Now, stream the full file, applying the in-memory changes as we go
    for await (const record of fullStream) {
        if ('basicSchedule' in record) {
            const key = getScheduleKey(record.basicSchedule);
            if (schedulesToDelete.has(key)) continue;

            const updatedRecord = schedulesToUpdate.get(key);
            if (updatedRecord) {
                yield updatedRecord;
                schedulesToUpdate.delete(key);
            } else {
                yield record;
            }
        } else if (record.recordType === 'AA') {
            const key = getAssociationKey(record);
            if (associationsToDelete.has(key)) continue;

            const updatedRecord = associationsToUpdate.get(key);
            if (updatedRecord) {
                yield updatedRecord;
                associationsToUpdate.delete(key);
            } else {
                yield record;
            }
        } else if (record.recordType === 'TI') {
            if (tiplocsToDelete.has(record.tiplocCode)) continue;

            const amendRecord = tiplocsToAmend.get(record.tiplocCode);
            if (amendRecord) {
                if (amendRecord.newTiplocCode) {
                    record.tiplocCode = amendRecord.newTiplocCode;
                }
                for (const [key, value] of Object.entries(amendRecord)) {
                    if (!['recordType','tiplocCode','newTiplocCode'].includes(key) && value !== undefined) {
                        // @ts-ignore We're only copying properties that exist on both types
                        record[key] = value;
                    }
                }
            }
            yield record;
        }
    }

    // Finally, yield any remaining records from the update maps. These are records
    // that were new in the update stream and did not correspond to any record in the full stream.
    for (const assoc of
        // Sort for deterministic output
        Array.from(associationsToUpdate.values())
            .sort((a, b) => getAssociationKey(a).localeCompare(getAssociationKey(b)))
        ) {
        yield assoc;
    }
    for (const schedule of
        // Sort for deterministic output
        Array.from(schedulesToUpdate.values())
            .sort((a, b) => getScheduleKey(a.basicSchedule).localeCompare(getScheduleKey(b.basicSchedule)))
        ) {
        yield schedule;
    }
}