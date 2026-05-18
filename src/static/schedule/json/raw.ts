import {
    AssociationCategory,
    AssociationDateIndicator,
    BankHolidayRunning, BusinessSector,
    DaysRun, PowerType, ReservationRequirementCode, SleeperAccommodationCode,
    StpIndicator, TimingLoadCode, TrainCategory, TrainServiceCode,
    TrainStatus
} from "../cif";
import {Routing, ScheduleDateString, TIPLOC} from "../../../types";

// #region Times

/**
 * A 1- or 2- character string used for representing allowance time,
 *  containing either just "H" (30 seconds), a number of minutes optionally followed by "H", or null (0 minutes).
 */
export type Allowance = null | 'H' | `${number}${'' | 'H'}`;

/** A string representing a time in HHMM format. */
export type MilitaryTime = `${number}`;

/** A string representing a time in HHMM'H' format, where an optional 'H' suffix indicates an additional 30 seconds. */
export type TimeWithHalfMinutes = `${MilitaryTime}${'' | 'H'}`;

// #endregion

// #region Records

/** The first record in a JSON SCHEDULE file, containing metadata. */
export interface JsonScheduleHeaderRecord {
    // This is a different and limited version of `EnvelopedMessage<"Metadata", { ... }>`
    JSONTimetableV1: {
        /** @example "public" */
        classification: string;
        timestamp: number;
        /** @example "Network Rail" */
        owner: string;
        Sender: {
            /** @example "Rockshore" */
            organisation: string;
            /** @example "NTROD" */
            application: string;
            /** @example "SCHEDULE" */
            component: string;
        };
        Metadata: {
            type: "full" | "update";
            sequence: number;
        };
    };
}

/**
 * A TIPLOC (timing point location) record in a JSON SCHEDULE file,
 *  identifying a location that may be used in the schedule.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Tiploc_Records}
 */
export interface JsonScheduleTiplocRecord {
    "TiplocV1": {
        /**
         * What is happening to this TIPLOC.
         *
         * For a full SCHEDULE file, this should always be "Create".
         */
        transaction_type: "Create" | "Update" | "Delete";
        /** The TIPLOC code affected. */
        tiploc_code: string;
        /** National Location Code */
        nalco: string;
        /** 5-digit TOPS location code. */
        staonox: `${number}`;
        /** 3-character Computer Reservation System (CRS) code. */
        crs_code: string;
        /** A 16-character description used in CAPRI. */
        description: string;
        /** The textual description of the location, up to 26 characters. */
        tps_description: string;
    }
}

/**
 * An association record in a JSON SCHEDULE file, identifying an association between two schedules.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Association_Records}
 */
export interface JsonScheduleAssociationRecord {
    "JsonAssociationV1": {
        /**
         * What is happening to this association.
         *
         * For a full SCHEDULE file, this should always be "Create".
         */
        transaction_type: "Create" | "Delete";
        /** The UID of the 'main' train in the association. */
        main_train_uid: string;
        /** The UID of the 'associated' train. */
        assoc_train_uid: string;
        /**
         * The first date the association is valid from, in RFC 3339 format.
         *
         * @see {@link https://www.ietf.org/rfc/rfc3339.txt}
         */
        assoc_start_date: string;
        /**
         * The last date the association is valid until, in RFC 3339 format.
         *
         * @see {@link https://www.ietf.org/rfc/rfc3339.txt}
         */
        assoc_end_date: string;
        /** Bitmask for the days of the week the train runs. */
        assoc_days: DaysRun;
        /** The category of the association. */
        category: AssociationCategory;
        /** Indicates if the association occurs on the same day, next day, or previous day. */
        date_indicator: AssociationDateIndicator;
        /** The TIPLOC where the association occurs. */
        location: string;
        /** Suffix digit for the 'main' train's location instance. */
        base_location_suffix?: number;
        /** Suffix digit for the 'associated' train's location instance. */
        assoc_location_suffix?: number;
        /** @deprecated */
        diagram_type?: "T";
        /** Short Term Plan (STP) indicator. */
        CIF_stp_indicator: StpIndicator;
    }
}

// #region Schedule locations

interface JsonScheduleLocationBase<LocationType extends "LO" | "LI" | "LT"> {
    /**
     * The type of location this record represents.
     * - `"LO"`: Origin
     * - `"LI"`: Intermediate location
     * - `"LT"`: Terminus
     */
    location_type: LocationType;
    /** Alias for `location_type`. */
    record_identity: LocationType;
    /** The TIPLOC code for the location. */
    tiploc_code: TIPLOC;
    /** An incrementing number to distinguish between multiple instances of the same TIPLOC in a schedule. */
    tiploc_instance: null | `${number}`;
    /** The platform number or line identifier. */
    platform: null | Routing;
    /** Engineering allowance, a buffer time for potential engineering work delays. */
    engineering_allowance: Allowance;
    /** Pathing allowance, a buffer time for operational regulation. */
    pathing_allowance: Allowance;
    /** Performance allowance, a buffer time to improve punctuality statistics. */
    performance_allowance: Allowance;
}

/**
 * A location in the schedule with a scheduled arrival time.
 *
 * Equivalent to `ArrivalLocationRecord` in CIF types.
 */
interface JsonScheduleArrivalLocation<LocationType extends "LO" | "LI"> extends JsonScheduleLocationBase<LocationType> {
    /** Scheduled arrival time. */
    arrival: TimeWithHalfMinutes;
    /** Public arrival time. */
    public_arrival: MilitaryTime;
}

/**
 * A location in the schedule with a scheduled departure time.
 *
 * Equivalent to `DepartureLocationRecord` in CIF types.
 */
interface JsonScheduleDepartureLocation<LocationType extends "LI" | "LT"> extends JsonScheduleLocationBase<LocationType> {
    /** Scheduled departure time. */
    departure: TimeWithHalfMinutes;
    /** Public departure time. */
    public_departure: MilitaryTime;
}

/**
 * An intermediate location in the schedule with scheduled arrival and departure times.
 *
 * Equivalent to `NormalIntermediateLocationRecord` in CIF types.
 */
export interface JsonScheduleNormalIntermediateLocation extends JsonScheduleArrivalLocation<"LI">, JsonScheduleDepartureLocation<"LI"> {}

/**
 * An intermediate location in the schedule for a passing point without stopping.
 *
 * Equivalent to `PassIntermediateLocationRecord` in CIF types.
 */
export interface JsonSchedulePassIntermediateLocation extends JsonScheduleLocationBase<"LI"> {
    /** Scheduled pass time. */
    pass: TimeWithHalfMinutes;
}

/**
 * The start of the schedule.
 *
 * Equivalent to `OriginLocationRecord` in CIF types.
 */
export type JsonScheduleOriginLocation = JsonScheduleArrivalLocation<"LO">;

/**
 * The intermediate locations in the schedule, which can be either a normal stop or a passing point,
 *
 * Equivalent to `IntermediateLocationRecord` in CIF types.
 */
export type JsonScheduleIntermediateLocation = JsonScheduleNormalIntermediateLocation | JsonSchedulePassIntermediateLocation;

/**
 * The end of the schedule.
 *
 * Equivalent to `TerminusLocationRecord` in CIF types.
 */
export type JsonScheduleTerminusLocation = JsonScheduleDepartureLocation<"LT">;

// #endregion

/**
 * A schedule record in a JSON SCHEDULE file, identifying a specific schedule.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Schedule_Records}
 */
export interface JsonScheduleScheduleRecord {
    "JsonScheduleV1": {
        /** Which bank holidays the train doesn't run on, if any. */
        CIF_bank_holiday_running: null | BankHolidayRunning;
        /** Short Term Plan (STP) indicator. */
        CIF_stp_indicator: StpIndicator;
        /** Whether subject to performance monitoring. */
        applicable_timetable: "Y" | "N";
        /** The ATOC code for the train operator. */
        atoc_code: string;
        new_schedule_segment: {
            // Just a blank string in all the examples I've seen
            traction_class: string;
            /**
             * A 5-digit numeric code allocated by Union Internationale des Chemins de Fer (UIC)
             * for services running via the Channel Tunnel.
             */
            uic_code: `${number}`;
        };
        /** Bitmask for the days of the week the train runs. */
        schedule_days_runs: DaysRun;
        /** The last date this schedule is valid until. */
        schedule_end_date: ScheduleDateString;
        schedule_segment: {
            /**
             * Signalling ID, also known as the train identity or the headcode (e.g., '2I04').
             * This is the reporting number used in operations.
             * Not to be confused with the NRS Headcode.
             */
            signalling_id: string;
            /** The category of the train. */
            CIF_train_category: TrainCategory;
            /**
             * National Reservation System (NRS) headcode, designated by train operator.
             * Not to be confused with the train identity, which is also known as the headcode.
             */
            CIF_headcode: string;
            /** @deprecated */
            CIF_course_indicator: 1;
            /** Service code for this train. */
            CIF_train_service_code: `${TrainServiceCode}`;
            /** The business sector or portion ID for the train, if applicable. */
            CIF_business_sector: "??" | BusinessSector;
            /** The power type of the train. */
            CIF_power_type: PowerType;
            /** The timing load code of the train, if applicable. */
            CIF_timing_load: null | TimingLoadCode;
            /** The planned maximum speed of the train in MPH. */
            CIF_speed: `${number}`;
            /**
             * A set of up to 6 operating characteristic codes that describe the train's features,
             *  concatenated into a single string.
             */
            CIF_operating_characteristics: null | string;
            /**
             * Indicates if the train has first class seating.
             *
             * `null` or `"B"` indicates the train has first class seating, while `"S"` indicates it does not.
             */
            CIF_train_class: null | "B" | "S";
            /** The train's sleeper accommodation type, if any. */
            CIF_sleepers: SleeperAccommodationCode | null;
            /** The reservation requirements for the train, if any. */
            CIF_reservations: ReservationRequirementCode | null;
            /** @deprecated */
            CIF_connection_indicator: null;
            /**
             * A set of up to 4 catering codes that describe the catering services available on the train,
             *  concatenated into a single string.
             */
            CIF_catering_code: null | string;
            /**
             * A set of up to 4 service brand codes associated with the train,
             *  concatenated into a single string.
             */
            CIF_service_branding: string;
            schedule_location: [
                JsonScheduleOriginLocation,
                ...JsonScheduleIntermediateLocation[],
                JsonScheduleTerminusLocation
            ];
        };
        /** The first date this schedule is valid from. */
        schedule_start_date: ScheduleDateString;
        /** The publication status of the train. */
        train_status: TrainStatus;
        /**
         * What is happening to this schedule.
         *
         * For a full SCHEDULE file, this should always be "Create".
         */
        transaction_type: "Create" | "Delete";
    }
}

/** The last record in a JSON SCHEDULE file. */
export interface JsonScheduleTrailerRecord {
    EOF: true;
}

// #endregion

/** A record/line in a JSON SCHEDULE file. */
export type JsonScheduleRecord =
    | JsonScheduleHeaderRecord
    | JsonScheduleTiplocRecord
    | JsonScheduleAssociationRecord
    | JsonScheduleScheduleRecord
    | JsonScheduleTrailerRecord;
