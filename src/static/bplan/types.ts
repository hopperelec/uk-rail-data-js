// #region Core

import {TIPLOC} from "../../types";

/** A complete, parsed BPLAN file, held in memory. */
export interface BplanData {
    /** The control record of the file, containing metadata about the extract. */
    header: PifRecord;
    /**
     * A collection of reference code definitions. The outer map is keyed by the reference code type (e.g., 'TCT' for Train Category),
     * and the inner map is keyed by the specific code (e.g., 'XX'), with the value being the full reference record.
     */
    references: Map<ReferenceCodeType, Map<string, ReferenceRecord>>;
    /** A collection of timing load definitions. */
    timingLoads: TimingLoadRecord[];
    /** A collection of location records, uniquely identified by their TIPLOC. */
    locations: Map<TIPLOC, LocationRecord>;
    /** A collection of platform and siding records. */
    platforms: PlatformRecord[];
    /** A collection of network link records, defining connections between locations. */
    networkLinks: NetworkLinkRecord[];
    /** A collection of timing link records, defining travel times over network links for specific train types. */
    timingLinks: TimingLinkRecord[];
    /** The trailer record of the file, containing record counts for validation. */
    footer: PitRecord;
}

/** Any top-level record that can be yielded by the streaming parser. */
export type BplanStreamRecord =
    | PifRecord
    | ReferenceRecord
    | TimingLoadRecord
    | LocationRecord
    | PlatformRecord
    | NetworkLinkRecord
    | TimingLinkRecord
    | PitRecord;

/** 3-character code representing a type of reference code provided in the file (e.g., 'TCT' for Train Category). */
export type ReferenceCodeType = string;

// #endregion

// #region Character codes

/**
 * Cycle type for the timetable data.
 * - I: Iterative
 * - S: Supplemental
 */
export type CycleType = 'I' | 'S';

/**
 * Timing point type for a location.
 * - T: TRUST (Train Running Under System TOPS) - a mandatory timing point for train reporting.
 * - M: Mandatory - a timing point required for planning but not necessarily for TRUST reporting.
 * - O: Optional - a timing point used for information or specific operational reasons.
 */
export type TimingPointType = 'T' | 'M' | 'O';

/**
 * Force LPB (Line, Path, Both) indicator.
 * - L: The running line code should appear in the timetable when approaching the location.
 * - P: The path should appear in the timetable when leaving the location.
 * - B: Both L and P apply.
 */
export type ForceLpb = 'L' | 'P' | 'B';

/**
 * Direction indicator for a network link.
 * - U: Up direction.
 * - D: Down direction.
 */
export type Direction = 'U' | 'D';

/**
 * Reversible line indicator.
 * - B: Bi-directional
 * - R: Reversible
 * - N: Neither
 */
export type ReversibleLine = 'B' | 'R' | 'N';

// #endregion

// #region Records

/** PIF - Control (Header) Record. Contains metadata for the entire file. */
export interface PifRecord {
    recordType: 'PIF';
    /** The version of the interface specification. */
    fileVersion: string;
    /** The database from which the file was extracted. */
    sourceSystem: string;
    /** The TOC (Train Operating Company) identifier. */
    tocId: string;
    /** The start date of the timetable period to which this data applies. */
    timetableStartDate: Date;
    /** The end date of the timetable period to which this data applies. */
    timetableEndDate: Date;
    /** The cycle type of the data (Iterative or Supplemental). */
    cycleType: CycleType;
    /** The stage of the data cycle (e.g., '0' for base data from Network Rail). */
    cycleStage: string;
    /** The date and time the file was created. */
    fileCreationDate: Date;
    /** A file sequence number (unused). */
    fileSequenceNumber: number;
}

/** REF - Reference Record. Defines the meaning of various codes used in CIF and BPLAN files. */
export interface ReferenceRecord {
    recordType: 'REF';
    /** The type of code being defined (e.g., 'TCT' for Train Category, 'ACT' for Activities). */
    referenceCodeType: ReferenceCodeType;
    /** The specific code being defined (e.g., 'XX' for Express Passenger). May be blank. */
    referenceCode: string;
    /** The free-format text description of the code. */
    description: string;
}

/** TLD - Timing Load Record. Defines a timing load used for calculating point-to-point timings. */
export interface TimingLoadRecord {
    recordType: 'TLD';

    // Primary keys
    /** The type of traction (e.g., '321', '153', 'EMU'). This is a primary key field. */
    tractionType: string;
    /** Trailing load in tonnes, plus an empty/loaded character for freight. Blank for standard loads. This is a primary key field. */
    trailingLoad: string;
    /** The maximum permitted speed for this timing load. This is a primary key field. */
    speed: string;
    /** The Route Availability (RA) number and gauge. This is a primary key field. */
    raGauge: string;
    // End of primary keys

    /** A free-format description of the timing load. */
    description: string;
    /** The power type as shown in the Integrated Train Planning System (ITPS). */
    itpsPowerType: string;
    /** The load as shown in ITPS. */
    itpsLoad: string;
    /** The limiting speed as shown in ITPS. */
    limitingSpeed: string;
}

/** LOC - Location Record. Defines a geographical or timing point on the railway network. */
export interface LocationRecord {
    recordType: 'LOC';
    /** The unique TIPLOC code for the location. This is the primary key. */
    locationCode: TIPLOC;
    /** The name of the location. */
    locationName: string;
    /** The date from which this location record is valid. */
    startDate: Date;
    /** The date until which this location record is valid. If omitted, the record is valid indefinitely. */
    endDate?: Date;
    /** The Ordnance Survey Easting grid reference. Not guaranteed to be accurate. */
    osEasting?: number;
    /** The Ordnance Survey Northing grid reference. Not guaranteed to be accurate. */
    osNorthing?: number;
    /** The type of timing point (TRUST, Mandatory, or Optional). */
    timingPointType: TimingPointType;
    /** The code for the zone responsible for maintaining this record. */
    zone: string;
    /** The 5-digit Station Number (STANOX) code. */
    stanoxCode?: number;
    /** True if the location is off the Network Rail network. */
    isOffNetwork: boolean;
    /** An indicator to force the display of the running line or path in timetables. */
    forceLpb?: ForceLpb;
}

/** PLT - Platform/Siding Record. Defines a specific platform or siding at a location. */
export interface PlatformRecord {
    recordType: 'PLT';

    // Primary keys
    /** The TIPLOC of the location where the platform resides. This is a primary key field. */
    locationCode: TIPLOC;
    /** A unique identifier for the platform at the location. This is a primary key field. */
    platformId: string;
    // End of primary keys

    /** The date from which this platform record is valid. */
    startDate: Date;
    /** The date until which this platform record is valid. If omitted, the record is valid indefinitely. */
    endDate?: Date;
    /** The maximum usable length of the platform in metres. Not guaranteed to be accurate. */
    length?: number;
    /** A code representing the power supply type available (e.g., third rail, overhead lines). */
    powerSupplyType: string;
    /** True if Driver-Only Operation (DOO) is allowed for passenger trains. */
    dooPassenger?: boolean;
    /** True if Driver-Only Operation (DOO) is allowed for non-passenger trains. */
    dooNonPassenger?: boolean;
}

/** NWK - Network Link Record. Defines a section of track between two locations. */
export interface NetworkLinkRecord {
    recordType: 'NWK';

    // Primary keys
    /** The TIPLOC of the origin location. This is a primary key field. */
    originLocation: TIPLOC;
    /** The TIPLOC of the destination location. This is a primary key field. */
    destinationLocation: TIPLOC;
    /** A code to distinguish between parallel running lines (e.g., 'FL' for Fast Line, 'SL' for Slow Line). This is a primary key field. */
    runningLineCode: string;
    /** The Route Availability (RA) number for the link. This is a primary key field. */
    routeAvailability: string;
    // End of primary keys

    /** A description for a non-standard running line code. */
    runningLineDescription?: string;
    /** The date from which this network link record is valid. */
    startDate: Date;
    /** The date until which this network link record is valid. If omitted, the record is valid indefinitely. */
    endDate?: Date;
    /** The direction of travel (Up/Down) at the start of the link. */
    initialDirection: Direction;
    /** The direction of travel (Up/Down) at the end of the link, which may differ if the link merges. */
    finalDirection?: Direction;
    /** The distance of the link in metres. Not guaranteed to be accurate. */
    distance?: number;
    /** True if Driver-Only Operation (DOO) is allowed for passenger trains on this link. */
    dooPassenger?: boolean;
    /** True if Driver-Only Operation (DOO) is allowed for non-passenger trains on this link. */
    dooNonPassenger?: boolean;
    /** True if Radio Electric Token Block (RETB) signalling is in use. */
    isRetb?: boolean;
    /** The code for the zone responsible for maintaining this record. */
    zone: string;
    /** Indicates if the line is bi-directional, reversible, or neither. */
    reversibleLine: ReversibleLine;
    /** A code representing the power supply type available on the link. */
    powerSupplyType: string;
    /** The maximum length of a train that can use this link, in metres. */
    maxTrainLength?: number;
}

/** TLK - Timing Link Record. Defines the time taken to traverse a network link for a specific train type. */
export interface TimingLinkRecord {
    recordType: 'TLK';
    /** The TIPLOC of the origin location. */
    originLocation: TIPLOC;
    /** The TIPLOC of the destination location. */
    destinationLocation: TIPLOC;
    /** A code to distinguish between parallel running lines. */
    runningLineCode: string;
    /** The type of traction this timing applies to. */
    tractionType: string;
    /** The trailing load this timing applies to. */
    trailingLoad: string;
    /** The maximum speed this timing applies to. */
    speed: string;
    /** The RA/Gauge combination this timing applies to. */
    raGauge: string;
    /** The entry speed in MPH. '0' for starting, '-1' for passing at max speed. */
    entrySpeed: number;
    /** The exit speed in MPH. '0' for stopping, '-1' for passing at max speed. */
    exitSpeed: number;
    /** The date from which this timing link record is valid. */
    startDate: Date;
    /** The date until which this timing link record is valid. If omitted, the record is valid indefinitely. */
    endDate?: Date;
    /** The sectional running time in the format `mmm'ss`. */
    sectionalRunningTime: string;
    /** An optional free-format description. */
    description?: string;
}

/** PIT - Footer Record. The final record in the file, containing counts of each record type. */
export interface PitRecord {
    recordType: 'PIT';
    /**
     * A map of record counts, keyed by the record type code (e.g., 'LOC', 'NWK').
     * The value contains the number of additions, changes, and deletions for that record type.
     * For BPLAN snapshots, change and delete counts should always be zero.
     */
    recordCounts: Map<string, { additions: number; changes: number; deletes: number; }>;
}

// #endregion

// #region Reference extraction

/** A map of BPLAN reference types to a set of codes to be resolved */
export type UnresolvedRefs = Record<string, Set<string>>;

/** A map of BPLAN reference types to a map of code -> resolved description. */
export type ResolvedRefs = Record<string, Record<string, string>>;

// #endregion
