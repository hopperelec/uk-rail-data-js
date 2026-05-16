import {EnvelopedMessage} from "../../shared-message-envelope/raw";
import {Headcode, Routing, ScheduleDateString, TIPLOC} from "../../../types";
import {
    AtocCode, BankHolidayRunning, BusinessSector, DaysRun, PowerType, ReservationRequirementCode,
    SleeperAccommodationCode, StpIndicator, TimingLoadCode, TrainCategory, TrainServiceCode, TrainStatus, TrainUID
} from "../../../static/schedule/cif";

/** Base structure for a location in the VSTP schedule. */
interface VstpScheduleLocationBase {
    /** The platform number or line identifier. */
    CIF_platform?: Routing;
    /** The line the train uses on departure. */
    CIF_line?: Routing;
    /** The path the train uses on arrival. */
    CIF_path?: Routing;
    /**
     * A set of up to 6 activity codes describing what the train does at this location,
     *  concatenated into a single string.
     */
    CIF_activity: string;
    /** Engineering allowance, a buffer time for potential engineering work delays. */
    CIF_engineering_allowance: string;
    /** Pathing allowance, a buffer time for operational regulation. */
    CIF_pathing_allowance: string;
    /** Performance allowance, a buffer time to improve punctuality statistics. */
    CIF_performance_allowance: string;
    /** The location of the train at this point in the schedule. */
    location: {
        tiploc: {
            tiploc_id: TIPLOC;
        };
    };
}

/**
 * A location in the schedule with a scheduled arrival time.
 *
 * Equivalent to `ArrivalLocationRecord` in CIF types.
 */
interface VstpScheduleArrival extends VstpScheduleLocationBase {
    /** The scheduled arrival time, in HHMMSS format. */
    scheduled_arrival_time: string;
    /** Public arrival time, in HHMMSS format. */
    public_arrival_time?: string;
}

/**
 * A location in the schedule with a scheduled departure time.
 *
 * Equivalent to `DepartureLocationRecord` in CIF types.
 */
interface VstpScheduleDeparture extends VstpScheduleLocationBase {
    /** The scheduled departure time, in HHMMSS format. */
    scheduled_departure_time: string;
    /** Public departure time, in HHMMSS format. */
    public_departure_time?: string;
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
    /** The scheduled pass time, in HHMMSS format. */
    scheduled_pass_time: string;
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
    signalling_id: string;
    /**
     * A 5-digit numeric code allocated by Union Internationale des Chemins de Fer (UIC)
     * for services running via the Channel Tunnel.
     */
    uic_code?: `${number}`;
    /** The ATOC code for the train operator. */
    atoc_code: AtocCode;
    /** The category of the train. */
    CIF_train_category: TrainCategory;
    /**
     * Headcode, also known as the train identity (e.g., '2I04'). This is the reporting number used in operations.
     * Not to be confused with the NRS Headcode.
     */
    CIF_headcode?: Headcode;
    /** @deprecated */
    CIF_course_indicator?: string;
    /** Service code for this train. */
    CIF_train_service_code: TrainServiceCode;
    /** The portion ID or business sector for the train, if applicable. */
    CIF_business_sector?: BusinessSector;
    /** The power type of the train. */
    CIF_power_type: PowerType;
    /** The timing load code of the train, if applicable. */
    CIF_timing_load?: TimingLoadCode;
    /** The planned maximum speed of the train in MPH. */
    CIF_speed?: `${number}`;
    /**
     * A set of up to 6 operating characteristic codes that describe the train's features,
     *  concatenated into a single string.
     */
    CIF_operating_characteristics?: string;
    // TODO: Not sure what this corresponds to, but might be able to figure it out by observation.
    CIF_train_class?: string;
    /** The train's sleeper accommodation type, if any. */
    CIF_sleepers?: SleeperAccommodationCode;
    /** The reservation requirements for the train, if any. */
    CIF_reservations: ReservationRequirementCode;
    /** @deprecated */
    CIF_connection_indicator?: string;
    /**
     * A set of up to 4 catering codes that describe the catering services available on the train,
     *  concatenated into a single string.
     */
    CIF_catering_code?: string;
    /**
     * A set of up to 4 service brand codes associated with the train,
     *  concatenated into a single string.
     */
    CIF_service_branding?: string;
    /** @deprecated */
    CIF_traction_class?: string;
    schedule_location: [
        VstpScheduleOrigin,
        ...VstpScheduleIntermediate[],
        VstpScheduleTerminus
    ]
}

/** Very Short Term Plan (VSTP) from Network Rail's VSTP feed. */
export interface VeryShortTermPlan {
    schedule_id: string;
    // TODO: The possible values for this don't seem to be documented anywhere,
    //       so I will need to confirm them by observation.
    /** @example "Create" */
    transaction_type: string
    schedule_start_date: ScheduleDateString;
    schedule_end_date: ScheduleDateString;
    /** Bitmask for the days of the week the train runs. */
    schedule_days_runs: DaysRun;
    /** Whether subject to performance monitoring (Y for yes, N for no). */
    applicable_timetable: "Y" | "N";
    /** Which bank holidays the train doesn't run on, if any. */
    CIF_bank_holiday_running: BankHolidayRunning;
    /**
     * The unique identifier for the train schedule.
     * For VSTPs, this usually starts with a space.
     */
    CIF_train_uid: TrainUID;
    /** The publication status of the train. */
    train_status: TrainStatus;
    /** Short Term Plan (STP) indicator. */
    CIF_stp_indicator: StpIndicator;
    schedule_segment: VstpScheduleSegment[];
}

/** The raw message wrapper for the VSTP feed. */
export interface VstpMessageWrapper {
    VSTPCIFMsgV1: EnvelopedMessage<'schedule', VeryShortTermPlan>;
}
