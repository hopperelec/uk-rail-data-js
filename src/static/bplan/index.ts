import {TrainCharacteristics, TrainSchedule, LocationRecord} from "../schedule/cif";
import {BplanStreamRecord, ResolvedRefs, UnresolvedRefs} from "./types";
export * from './types';
export { bplanStream, consumeBplanStream } from './parser';

/**
 * Finds all references in the given schedules that can be resolved using BPLAN REF records.
 *
 * @param schedules An iterable of TrainSchedule objects to search for references in.
 * @returns An object mapping reference types to sets of reference codes that were found in the schedules.
 */
export function findRefsInSchedules(schedules: Iterable<TrainSchedule>): UnresolvedRefs {
    const refsMap: UnresolvedRefs = {};

    function addIf(type: string, ref?: string): void {
        if (!ref) return;
        if (refsMap[type]) {
            refsMap[type].add(ref);
        } else {
            refsMap[type] = new Set([ref]);
        }
    }

    function addSet(type: string, refs: Set<string>): void {
        if (refs.size === 0) return;
        if (refsMap[type]) {
            for (const ref of refs) {
                refsMap[type].add(ref);
            }
        } else {
            refsMap[type] = refs;
        }
    }

    function addCharacteristics(characteristics: TrainCharacteristics) {
        addIf('TCT', characteristics.trainCategory);
        addIf('BUS', characteristics.portionId);
        addSet('OPC', characteristics.operatingCharacteristics);
        addIf('SLE', characteristics.sleepers);
        addIf('RES', characteristics.reservations);
        addSet('CAT', characteristics.catering);
        addSet('BRA', characteristics.serviceBrandCodes);
    }

    for (const schedule of schedules) {
        addCharacteristics(schedule.basicSchedule);
        addIf('BHX', schedule.basicSchedule.bankHolidayRunning);
        addIf('TST', schedule.basicSchedule.trainStatus);
        addIf('TOC', schedule.extraDetails?.atocCode);
        const locations: Omit<LocationRecord, "recordType">[] = [
            schedule.originLocation,
            ...schedule.intermediateLocations,
            schedule.terminatingLocation
        ];
        for (const location of locations) {
            addSet('ACT', location.activities);
            if (location.changeEnRoute) addCharacteristics(location.changeEnRoute);
        }
    }

    return refsMap;
}

/**
 * Resolves the given references using the provided BPLAN stream.
 *
 * @param bplanStream An async iterable of BplanStreamRecord objects to search for REF records in.
 * @param refsToResolve An object mapping reference types to sets of reference codes that need to be resolved.
 * @returns An object mapping reference types to objects that map reference codes to their descriptions.
 */
export async function resolveRefsInBPLAN(
    bplanStream: AsyncIterable<BplanStreamRecord>,
    refsToResolve: UnresolvedRefs
): Promise<ResolvedRefs> {
    const resolvedRefs: ResolvedRefs = {};
    for await (const record of bplanStream) {
        if (record.recordType !== "REF") continue;
        const type = record.referenceCodeType;
        const ref = record.referenceCode;
        if (refsToResolve[type]?.has(ref)) {
            if (!resolvedRefs[type]) {
                resolvedRefs[type] = {};
            }
            resolvedRefs[type][ref] = record.description;
        }
    }
    return resolvedRefs;
}
