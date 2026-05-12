// #region Core

import {Routing, TIPLOC} from "../../../types";

/** A unique identifier for a train schedule. */
export type ScheduleKey = string;
/** A unique identifier for an association. */
export type AssociationKey = string;

/**
 * Unique Identity of a train in TRUST.
 * Pattern: `^[ ABCFGHJKLMNPQRSUVWXY]\d{5}$` or a space/letter (space for a VSTP, otherwise a letter) followed by 5 digits.
 *
 * @example 'A12345'
 */
export type TrainUID = string;

/**
 * 8-digit code identifying the service group for revenue attribution.
 *
 * @see {@link https://wiki.openraildata.com/index.php/TrainServiceCode}
 */
export type TrainServiceCode = number;

/** A complete, parsed Common Interface File, held in memory. */
export interface CifData {
    /** The header record of the file, containing metadata about the extract. */
    header: HeaderRecord;
    /** A collection of train schedules, uniquely identified by a composite key. */
    schedules: Map<ScheduleKey, TrainSchedule>;
    /** A collection of train associations, uniquely identified by a composite key. */
    associations: Map<AssociationKey, AssociationRecord>;
    /** Changes to TIPLOC (Timing Point Location) records. */
    tiplocChanges: {
        inserts: TiplocInsertRecord[];
        amends: TiplocAmendRecord[];
        deletes: TiplocDeleteRecord[];
    };
}

/**
 * A single train schedule, which is a collection of related records
 * describing a train's journey on a specific set of dates. This is a primary logical unit.
 */
export interface TrainSchedule {
    /** Basic schedule information (BS record). This is the primary record for a schedule. */
    basicSchedule: Omit<BasicScheduleRecord, "recordType">;
    /** Extra details for the basic schedule (BX record), like the train operator code. */
    extraDetails?: Omit<BasicScheduleExtraDetailsRecord, "recordType">;
    /** The origin location record (LO), marking the start of the journey. */
    originLocation: Omit<OriginLocationRecord, "recordType">;
    /** A list of intermediate stopping or passing points in the journey (LI records). */
    intermediateLocations: Omit<IntermediateLocationRecord, "recordType">[];
    /** The terminating location record (LT), marking the end of the journey. */
    terminatingLocation: Omit<TerminusLocationRecord, "recordType">;
}

/** Characteristics that define the nature and capabilities of a train. */
export interface TrainCharacteristics {
    /**
     * Two-character code for the train category.
     * These are defined in the BPLAN file as TCT references.
     */
    trainCategory: string;
    /**
     * Train Identity, also known as the headcode (e.g., '2I04'). This is the reporting number used in operations.
     * Not to be confused with the NRS Headcode.
     */
    trainIdentity: string;
    /**
     * National Reservation System (NRS) headcode, designated by train operator.
     * Not to be confused with the train identity, which is also known as the headcode.
     */
    headcode?: string;
    /** Service code for this train. */
    trainServiceCode: TrainServiceCode;
    /**
     * Portion ID or Business Sector (BUSSEC), used to identify parts of a train in joining/splitting services.
     * These are defined in the BPLAN file as BUS references.
     */
    portionId?: string;
    /** The power type of the train. */
    powerType: PowerType;
    /**
     * The timing load characteristics of the train, affecting its performance calculations.
     *
     * Diesel Mechanical Multiple Units (Air Brake):
     * - A: Class 14x series 2-axle
     * - E: Class 158, 168, 170, 172, 175
     * - N: Class 165
     * - S: Class 150, 153, 155 or 156
     * - T: Class 165/1 or 166
     * - V: Class 220/221; Bombardier DMU
     * - X: Class 159
     *
     * DMU/DPU Power Weight Codes:
     * - D1: Power car + trailer
     * - D2: 2 power cars + trailer
     * - D3: Power twin
     *
     * EMU Codes:
     * Up to three-numerics (0 - 999) usually indicating the specific type of EMU (e.g. 321, 315).
     * There are occasional exceptions to this rule.
     *
     * Hauled Train (D, E or ED) Planned Load.
     * 1-9999: Load in Tonnes (1-999 only with ED).
     */
    timingLoad?: string;
    /** The planned maximum speed of the train in MPH. */
    speed: number;
    /**
     * A set of up to 6 operating characteristic codes that describe the train's features.
     * These are defined in the BPLAN file as OPC references.
     */
    operatingCharacteristics: Set<string>;
    /** Indicates if the train has first class seating. */
    hasFirstClassSeating: boolean;
    /**
     * Sleeper accommodation type, if any.
     * These are defined in the BPLAN file as SLE references.
     */
    sleepers?: string;
    /**
     * 1-character code indicating the reservation reequirements for the train, if any.
     * These are defined in the BPLAN file as RES references.
     */
    reservations?: string;
    /**
     * A set of up to 4 catering codes that describe the catering services available on the train.
     * These are defined in the BPLAN file as CAT references.
     */
    catering: Set<string>;
    /**
     * Service branding associated with the train (e.g., 'E' for Eurostar).
     * These are defined in the BPLAN file as BRA references.
     */
    serviceBrandCodes: Set<string>;
}

/** Any top-level logical record that can be yielded by the streaming parser. */
export type CifStreamRecord =
    | HeaderRecord
    | TrainSchedule
    | AssociationRecord
    | TiplocRecord;

// #endregion

// #region Enum-like

/**
 * Transaction Type, indicating the action to be taken on a record.
 * - N: New record.
 * - D: Delete record.
 * - R: Revise (update) record.
 */
export type TransactionType = 'N' | 'D' | 'R';

/**
 * Short Term Plan (STP) Indicator. Defines if the schedule is permanent or a short-term variation.
 * - P: Permanent schedule.
 * - O: STP Overlay of a permanent schedule.
 * - N: New STP schedule (not an overlay).
 * - C: STP Cancellation of a permanent schedule.
 */
export type StpIndicator = 'P' | 'O' | 'N' | 'C';

/**
 * A code indicating the type of power used by the train.
 * - D  : Diesel
 * - DEM: Diesel Electric Multiple Unit
 * - DMU: Diesel Mechanical Multiple Unit
 * - E  : Electric.
 * - ED : Electro-Diesel.
 * - EML: EMU plus D, E, ED locomotive.
 * - EMU: Electric Multiple Unit.
 * - HST: High Speed Train.
 */
export type PowerType = 'D' | 'DEM' | 'DMU' | 'E' | 'ED' | 'EML' | 'EMU' | 'HST';

/**
 * Association Category, indicating the type of association between two trains.
 * - JJ: Join
 * - VV: Split
 * - NP: Next/Previous working
 */
export type AssociationCategory = 'JJ' | 'VV' | 'NP';

/**
 * Association Date Indicator. Indicates if an association occurs on the same day, next day, or previous day.
 * - S: Standard (same day)
 * - N: Over next midnight
 * - P: Over previous midnight
 */
export type AssociationDateIndicator = 'S' | 'N' | 'P';

// #endregion

// #region Individual record types

/**
 * HD - Header Record. Contains metadata for the entire file.
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Header}
 */
export interface HeaderRecord {
    recordType: 'HD';
    /** The full identity of the file on the mainframe system. */
    fileMainframeIdentity: string;
    /** The date and time the extract file was created. */
    date: Date;
    /** A unique reference for this file. */
    currentFileRef: string;
    /** The unique reference of the last file sent to this user. Should match the `currentFileRef` of the previous file. */
    lastFileRef: string;
    /** True if this file is an update (incremental) extract; false if it's a full extract. */
    isUpdate: boolean;
    /** Version of the CIF generation software. */
    version: string;
    /** The start date of the user's requested time window for this extract. */
    userExtractStartDate: string;
    /** The end date of the user's requested time window for this extract. */
    userExtractEndDate: string;
}

// #region Schedule records

/**
 * Basic Schedule (BS) record. The main record defining a train's core attributes.
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Basic_Schedule}
 */
export interface BasicScheduleRecord extends TrainCharacteristics {
    recordType: 'BS';
    transactionType: TransactionType;
    /** The unique identifier for the train schedule. */
    trainUID: TrainUID;
    /** The first date this schedule is valid from, in YYMMDD format. */
    dateRunsFrom: string;
    /** The last date this schedule is valid until, in YYMMDD format. */
    dateRunsTo: string;
    /** Bitmask for the days of the week (Mon-Sun) the train runs, where 1 indicates it runs. */
    daysRun: string;
    /**
     * 1-character code indicating which bank holidays the train doesn't run on, if any.
     * These are defined in the BPLAN file as BHX references.
     */
    bankHolidayRunning?: string;
    /**
     * 1-character code indicating the publication status of the train.
     * These are defined in the BPLAN file as TST references.
     */
    trainStatus: string;
    /** Short Term Plan (STP) indicator. */
    stpIndicator: StpIndicator;
}

/**
 * Basic Schedule Extra Details (BX) record. Contains supplementary information for a schedule.
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Basic_Schedule_Extended}
 */
export interface BasicScheduleExtraDetailsRecord {
    recordType: 'BX';
    /**
     * A 5-digit numeric code allocated by Union Internationale des Chemins de Fer (UIC)
     * for services running via the Channel Tunnel.
     */
    uicCode?: number;
    /**
     * Two-character code devised by the Association of Train Operating Companies (ATOC)
     * to identify the operator of the train service.
     * These are defined in the BPLAN file as TOC references.
     */
    atocCode: string;
    /** Whether subject to performance monitoring. */
    applicableTimetableSchedule: boolean;
}

// #endregion

// #region Location records

/**
 * A generic location record, used for Origin (LO), Intermediate (LI), and Terminus (LT).
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Location}
 */
interface LocationRecordBase {
    recordType: 'LO' | 'LI' | 'LT';
    /**
     * Timing Point Location code. A unique code for a location on the railway network.
     * May have a suffix (e.g., 'MSTON 2') to distinguish multiple visits.
     */
    location: TIPLOC;

    /** The platform number or line identifier. */
    platform?: Routing;
    /** The line the train uses on departure. */
    line?: Routing;
    /** The path the train uses on arrival. */
    path?: Routing;

    /**
     * A set of up to 6 activity codes describing what the train does at this location.
     * These are defined in the BPLAN file as ACT references.
     */
    activities: Set<string>;

    /** Engineering allowance, a buffer time for potential engineering work delays. */
    engineeringAllowance?: string;
    /** Pathing allowance, a buffer time for operational regulation. */
    pathingAllowance?: string;
    /** Performance allowance, a buffer time to improve punctuality statistics. */
    performanceAllowance?: string;

    /** If this location record was preceded by a CR (Change en Route) record, its data is stored here. */
    changeEnRoute?: Omit<ChangeEnRouteRecord, 'recordType' | 'location'>;
}

/**  A location record with a schedules arrival time. */
export interface ArrivalLocationRecord extends LocationRecordBase {
    /** Scheduled arrival time, in HHMM format with an optional 'H' suffix for a half-minute. */
    scheduledArrivalTime: string;
    /** Public arrival time, in HHMM format. */
    publicArrivalTime: string;
}

/** A location record with a scheduled departure time. */
export interface DepartureLocationRecord extends LocationRecordBase {
    /** Scheduled departure time, in HHMM format with an optional 'H' suffix for a half-minute. */
    scheduledDepartureTime: string;
    /** Public departure time, in HHMM format. */
    publicDepartureTime: string;
}

/**
 * Origin Location (LO) record. Marks the start of a train's journey.
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Location#LO_-_Origin_Location_Record_Fields
 */
export interface OriginLocationRecord extends DepartureLocationRecord {
    recordType: 'LO';
}

/** Intermediate Location (LI) record with arrival and departure times. */
export interface NormalIntermediateLocationRecord extends ArrivalLocationRecord, DepartureLocationRecord {
    recordType: 'LI';
}

/** Intermediate Location (LI) record for a passing point without stopping. */
export interface PassIntermediateLocationRecord extends LocationRecordBase {
    recordType: 'LI';
    /** Scheduled pass time, in HHMM format with an optional 'H' suffix for a half-minute. */
    scheduledPassTime: string;
}

/**
 * An Intermediate Location (LI) record, either a normal stop or a passing point.
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Location#LI_-_Intermediate_Location_Record_Fields
 */
export type IntermediateLocationRecord = NormalIntermediateLocationRecord | PassIntermediateLocationRecord;

/**
 * Terminus Location (LT) record. Marks the end of a train's journey.
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Location#LT_-_Terminus_Location_Record_Fields
 */
export interface TerminusLocationRecord extends Omit<ArrivalLocationRecord, 'line' | 'engineeringAllowance' | 'pathingAllowance' | 'performanceAllowance'> {
    recordType: 'LT';
}

/**
 * A location record of any type (origin, intermediate, or terminus).
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Location}
 */
export type LocationRecord = OriginLocationRecord | IntermediateLocationRecord | TerminusLocationRecord;

// #endregion

/**
 * Change en Route (CR) record. Indicates a change in train characteristics from a specific location onwards.
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Location#CR_-_Change-en-Route_Record_Fields}
 */
export interface ChangeEnRouteRecord extends TrainCharacteristics {
    recordType: 'CR';
    /** Where the change applies from */
    location: TIPLOC;
    /**
     * A 5-digit numeric code allocated by Union Internationale des Chemins de Fer (UIC)
     * for services running via the Channel Tunnel.
     */
    uicCode?: number;
}

/**
 * Association (AA) record. Defines a link between two train schedules (e.g., joining, splitting).
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Association_Records}
 */
export interface AssociationRecord {
    recordType: 'AA';
    /** The type of transaction being applied */
    transactionType: TransactionType;
    /** The UID of the 'main' train in the association. */
    mainTrainUID: TrainUID;
    /** The UID of the 'associated' train. */
    associatedTrainUID: TrainUID;
    /** The first date the association is valid from, in YYMMDD format. */
    startDate: string;
    /** The last date the association is valid until, in YYMMDD format. */
    endDate: string;
    /** Bitmask for the days of the week (Mon-Sun) the association runs, where 1 indicates it runs. */
    daysRun: string;
    /** The category of the association. */
    category: AssociationCategory;
    /** Indicates if the association occurs on the same day, next day, or previous day. */
    dateIndicator: AssociationDateIndicator;
    /** The TIPLOC where the association occurs. */
    location: TIPLOC;
    /** Suffix digit for the 'main' train's location instance. */
    baseLocationSuffix?: number;
    /** Suffix digit for the 'associated' train's location instance. */
    assocLocationSuffix?: number;
    /** Whether the association is for passenger use, as opposed to operational only. */
    isForPassengerUse: boolean;
    /** Short Term Plan (STP) indicator. */
    stpIndicator: StpIndicator;
}

// #endregion

// #region TIPLOC records

/**
 * Base properties shared by TI and TA records.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Tiploc_Records}
 */
export interface TiplocRecordBase {
    /** The original TIPLOC code of the location affected. */
    tiplocCode: TIPLOC;
    /** National Location Code */
    nalco: number;
    /** National Location Code check character. */
    nlcCheckChar: string;
    /** The textual description of the location, up to 26 characters. */
    tpsDescription: string;
    /** 5-digit TOPS location code. */
    stanox?: number;
    /** Computer Reservation System (CRS) code, 3-character. */
    crsCode: string;
    /** A 16-character description used in CAPRI. */
    description: string;
}

/**
 * TIPLOC Insert (TI) record. Defines a new timing point location.
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Tiploc_Insert}
 */
export interface TiplocInsertRecord extends TiplocRecordBase {
    recordType: 'TI';
    /** The new TIPLOC code being created. */
    tiplocCode: TIPLOC;
}

/**
 * TIPLOC Amend (TA) record. Defines a change to an existing timing point location.
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Tiploc_Amend}
 */
export interface TiplocAmendRecord extends TiplocRecordBase {
    recordType: 'TA';
    /** If the TIPLOC code itself is being changed, this holds the new code. */
    newTiplocCode?: TIPLOC;
}

/**
 * TIPLOC Delete (TD) record. Deletes an existing timing point location.
 *
 * @see {@link https://wiki.openraildata.com/index.php/CIF_Tiploc_Delete}
 */
export interface TiplocDeleteRecord {
    recordType: 'TD';
    /** The TIPLOC code to be deleted. */
    tiplocCode: TIPLOC;
}

/**
 * Any record representing a change to a TIPLOC.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Tiploc_Records}
 */
export type TiplocRecord = TiplocInsertRecord | TiplocAmendRecord | TiplocDeleteRecord;

// #endregion

// #endregion
