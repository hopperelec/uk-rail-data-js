import {AssociationKey, AssociationRecord, BasicScheduleRecord, ScheduleKey} from "./cif";

/**
 * Generates a unique key for a schedule record.
 *
 * @param bs The schedule record for which to generate the key.
 * @returns The unique key for the record.
 */
export function getScheduleKey(bs: Omit<BasicScheduleRecord, "recordType">): ScheduleKey {
    return `${bs.trainUID}-${bs.dateRunsFrom}-${bs.stpIndicator}`;
}

/**
 * Generates a unique key for an association record.
 *
 * @param aa The association record for which to generate the key.
 * @returns The unique key for the record.
 */
export function getAssociationKey(aa: Omit<AssociationRecord, "recordType">): AssociationKey {
    return `${aa.mainTrainUID}-${aa.associatedTrainUID}-${aa.location}-${aa.startDate}-${aa.stpIndicator}`;
}
