import {Headcode, Routing, TIPLOC} from "../../../types";
import {
    ActivityCode,
    AtocCode,
    BankHolidayRunning, BusinessSector, CateringCode,
    DaysRun, OperatingCharacteristic,
    PowerType, ReservationRequirementCode, ServiceBrandCode, SleeperAccommodationCode,
    StpIndicator, TimingLoadCode, TrainCategory,
    TrainServiceCode, TrainStatus,
    TrainUID
} from "../../../static/schedule/cif";

/** Base structure for a location in the VSTP schedule. */
export interface VstpScheduleLocationBase {
    /** The platform number or line identifier. */
    platform?: Routing;
    /** The line the train uses on departure. */
    line?: Routing;
    /** The path the train uses on arrival. */
    path?: Routing;
    /** A set of up to 6 activity codes describing what the train does at this location. */
    activities: Set<ActivityCode>;
    /** Engineering allowance, a buffer time for potential engineering work delays. */
    engineeringAllowance: string;
    /** Pathing allowance, a buffer time for operational regulation. */
    pathingAllowance: string;
    /** Performance allowance, a buffer time to improve punctuality statistics. */
    performanceAllowance: string;
    /** The location of the train at this point in the schedule. */
    location: TIPLOC;
}

/**
 * A location in the schedule with a scheduled arrival time.
 *
 * Equivalent to `ArrivalLocationRecord` in CIF types.
 */
interface VstpScheduleArrival extends VstpScheduleLocationBase {
    scheduledArrivalTime: Temporal.PlainTime;
    publicArrivalTime?: Temporal.PlainTime;
}

/**
 * A location in the schedule with a scheduled departure time.
 *
 * Equivalent to `DepartureLocationRecord` in CIF types.
 */
interface VstpScheduleDeparture extends VstpScheduleLocationBase {
    scheduledDepartureTime: Temporal.PlainTime;
    publicDepartureTime?: Temporal.PlainTime;
}

/**
 * An intermediate location in the schedule with scheduled arrival and departure times.
 *
 * Equivalent to `NormalIntermediateLocationRecord` in CIF types.
 */
export interface VstpScheduleNormalIntermediate extends VstpScheduleArrival, VstpScheduleDeparture {}

/**
 * An intermediate location in the schedule for a passing point without stopping.
 *
 * Equivalent to `PassIntermediateLocationRecord` in CIF types.
 */
export interface VstpSchedulePassIntermediate extends VstpScheduleLocationBase {
    scheduledPassTime: Temporal.PlainTime;
}

/**
 * The start of the schedule.
 *
 * Equivalent to `OriginLocationRecord` in CIF types.
 */
export type VstpScheduleOrigin = VstpScheduleDeparture;

/**
 * The intermediate locations in the schedule, which can be either a normal stop or a passing point,
 *
 * Equivalent to `IntermediateLocationRecord` in CIF types.
 */
export type VstpScheduleIntermediate = VstpScheduleNormalIntermediate | VstpSchedulePassIntermediate;

/**
 * The end of the schedule.
 *
 * Equivalent to `TerminusLocationRecord` in CIF types.
 */
export type VstpScheduleTerminus = VstpScheduleArrival;

/** A location in the VSTP schedule. */
export type VstpScheduleLocation = VstpScheduleOrigin | VstpScheduleIntermediate | VstpScheduleTerminus;

export interface VstpScheduleSegment {
    signallingId: string;
    /**
     * A 5-digit numeric code allocated by Union Internationale des Chemins de Fer (UIC)
     * for services running via the Channel Tunnel.
     */
    uicCode?: number;
    /** The ATOC code for the train operator. */
    atocCode: AtocCode;
    /** The category of the train. */
    trainCategory: TrainCategory;
    /**
     * Train identity, also known as the headcode (e.g., '2I04'). This is the reporting number used in operations.
     * Not to be confused with the NRS Headcode.
     */
    trainIdentity?: Headcode;
    /** Service code for this train. */
    trainServiceCode: TrainServiceCode;
    /** The business sector or portion ID for the train, if applicable. */
    businessSector?: BusinessSector;
    /** The power type of the train. */
    powerType: PowerType;
    /** The timing load code of the train, if applicable. */
    timingLoad?: TimingLoadCode;
    /** The planned maximum speed of the train in MPH. */
    speed?: number;
    /** A set of up to 6 operating characteristic codes that describe the train's features. */
    operatingCharacteristics: Set<OperatingCharacteristic>;
    /** Indicates if the train has first class seating. */
    hasFirstClassSeating: boolean;
    /** The train's sleeper accommodation type, if any. */
    sleeperAccommodation?: SleeperAccommodationCode;
    /** The reservation requirements for the train, if any. */
    reservationRequirements: ReservationRequirementCode;
    /** A set of up to 4 catering codes that describe the catering services available on the train. */
    catering: Set<CateringCode>;
    /** A set of up to 4 service brand codes associated with the train. */
    serviceBranding: Set<ServiceBrandCode>;
    locations: [
        VstpScheduleOrigin,
        ...VstpScheduleIntermediate[],
        VstpScheduleTerminus
    ]
}

/** Very Short Term Plan (VSTP) from Network Rail's VSTP feed. */
export interface VeryShortTermPlan {
    scheduleId: string;
    // TODO: The possible values for this don't seem to be documented anywhere,
    //       so I will need to confirm them by observation.
    /** @example "Create" */
    transactionType: string
    scheduleStartDate: Temporal.PlainDate;
    scheduleEndDate: Temporal.PlainDate;
    /** Bitmask for the days of the week the train runs. */
    daysRun: DaysRun;
    /** Whether subject to performance monitoring. */
    applicableTimetable: boolean;
    /** Which bank holidays the train doesn't run on, if any. */
    bankHolidayRunning: BankHolidayRunning;
    /**
     * The unique identifier for the train schedule.
     * For VSTPs, this usually starts with a space.
     */
    trainUID: TrainUID;
    /** The publication status of the train. */
    trainStatus: TrainStatus;
    /** Short Term Plan (STP) indicator. */
    stpIndicator: StpIndicator;
    segments: VstpScheduleSegment[];
}
