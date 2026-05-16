import {StpIndicator, TrainServiceCode, TrainUID} from "../../../static/schedule/cif";
import {UnixEpochMsTimestamp, StanoxCode, Routing, ScheduleDateString} from "../../../types";

// #region Core

/**
 * 10-character alphanumeric code uniquely identifying a train service, allocated during activation.
 *
 * Pattern: `^\d\d[A-Z0-9]{6}\d\d$`, or AABBBBCDEE as described below.
 * AA is the first two digits of the origin STANOX, indicating the area where the train starts
 * BBBB is the train identity (headcode)
 * C is the TSPEED (train status code) of the train - see wiki for valid values
 * D is the Call Code of the train, which indicates the time of day that the train departs from its origin - see wiki for valid values
 * EE is the day of the month on which the train originated
 *
 * @example
 * "775F25MP24" indicates a train:
 * - starting in STANOX area 77 (Pengam FLT, Cardiff Docks, Cardiff Central)
 * - with headcode 5F25
 * - with a TSPEED of M (Passenger and Parcels in WTT)
 * - with a Call Code of P (departs between 1430 and 1459)
 * - originating on the 24th of the month
 *
 * @see {@link https://wiki.openraildata.com/index.php/TSPEED}
 * @see {@link https://wiki.openraildata.com/index.php/Call_Code}
 */
export type TrustTrainId = string;

/** 2-digit numeric code uniquely identifying the Train Operating Company (TOC) that operates the train service. */
export type TocId = `${number}`;

/**
 * 2-character alphanumeric code indicating the reason for a cancellation or change of origin.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Delay_Attribution_Guide}
 */
export type DelayAttributionCode = string;

/** 4-digit numeric code from 0001 to 0008 identifying the type of message from the TRUST feed. */
export type TrustMsgType =
    | "0001" // Call/Activation
    | "0002" // Cancellation
    | "0003" // Movement
    // "0004" for "Unidentified train" is not used in production
    | "0005" // Reinstatement
    | "0006" // Change of Origin
    | "0007" // Change of Identity
    | "0008"; // Change of Location

/** The header of a message from the TRUST feed. */
export interface TrustMsgHeader {
    msg_type: TrustMsgType;
    /** When the message was pushed to the queue. */
    msg_queue_timestamp: UnixEpochMsTimestamp;
    /**
     * LATA or CICS Session of the inputting terminal.
     *
     * @see {@link https://wiki.openraildata.com/index.php/LATA}
     * @see {@link https://wiki.openraildata.com/index.php/CICS_Session}
     */
    source_dev_id?: string;
    /**
     * NCI signon of the inputting user.
     *
     * @see {@link https://wiki.openraildata.com/index.php/NCI_signon}
     */
    user_id?: string;
    original_data_source?: string;
    source_system_id: "TRUST";
}

/** Base structure for the body of any message from the TRUST feed. */
export interface TrustMsgBodyBase {
    /**
     * The unique train ID allocated at call/activation time,
     *  which will be the same for all messages relating to the same train,
     *  even if the train changes identity later in its journey.
     */
    train_id: TrustTrainId;
    /**
     * If the train has previously changed identity,
     *  this field will contain the revised_train_id from the most recent Change of Identity message for this train.
     */
    current_train_id?: string;
    train_file_address?: string;
    train_service_code: TrainServiceCode;
}

/** Base structure for any message from the TRUST feed. */
interface TrustMsgBase {
    header: TrustMsgHeader;
    /** The body of the message, which will have different fields depending on the message type. */
    body: TrustMsgBodyBase;
}

// #endregion

// #region Individual message types

// #region Message 0001 - Call/Activation

/**
 * The header of a train call/activation message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Activation
 */
export interface TrustCallHeader extends TrustMsgHeader {
    msg_type: "0001";
    original_data_source: "TSIA";
    source_dev_id?: never;
    user_id?: never;
}

/**
 * The body of a train call/activation message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Activation}
 */
export interface TrustCallBody extends TrustMsgBodyBase {
    current_train_id?: never;

    toc_id: TocId;

    /** C from CIF/ITPS, V from VSTP/TOPS */
    schedule_source: "C" | "V";
    /** Either `"00000"` for a CIF/ITPS schedule, or the TOPS unique ID of the schedule. */
    d1266_record_number: `${number}`;

    /** Start date of the schedule */
    schedule_start_date: ScheduleDateString;
    /** End date of the schedule. */
    schedule_end_date: ScheduleDateString;
    /** Train identity (headcode) and TSPEED value. */
    schedule_wtt_id: string;
    schedule_type: StpIndicator;
    train_uid: TrainUID;

    /** Whether the train was called automatically by TRUST, or manually by the operator. */
    train_call_type: "AUTOMATIC" | "MANUAL";
    train_call_mode: "NORMAL";

    /**
     * When the train is scheduled to start its journey.
     * This may be the day after it is called if called before midnight and scheduled to start after midnight.
     *
     * There is a known problem with this value for trains that
     *  start their journey between 0001 and 0200 the next day during daylight savings.
     * To work around this, it is recommended to use the date in the origin_dep_timestamp field.
     */
    tp_origin_timestamp: ScheduleDateString;
    /** When the train was originally created in TRUST. */
    creation_timestamp: UnixEpochMsTimestamp;
    /** When the train is scheduled to start its journey according to the WTT. */
    origin_dep_timestamp: UnixEpochMsTimestamp;

    /** Where the train is scheduled to start. */
    sched_origin_stanox: StanoxCode;
    /** The origin location when different to the original schedule. */
    tp_origin_stanox?: StanoxCode;
}

/**
 * A train call/activation message from the TRUST feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Activation}
 */
export interface TrustCallMsg extends TrustMsgBase {
    header: TrustCallHeader;
    body: TrustCallBody;
}

// #endregion

// #region Message 0002 - Cancellation

/**
 * The header of a train cancellation message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Cancellation}
 */
export interface TrustCancellationHeader extends TrustMsgHeader {
    msg_type: "0002";
    original_data_source?: "TOPS" | "SDR" | "TRUST DA" | "TM ROC 30" | "";
}

/**
 * The body of a train cancellation message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Cancellation}
 */
export interface TrustCancellationBody extends TrustMsgBodyBase {
    current_train_id?: never;

    toc_id: TocId;
    division_code: TocId;

    /** How far into its journey the train was when it was cancelled. */
    canx_type: "AT ORIGIN" | "EN ROUTE" | "ON CALL" | "OUT OF PLAN";
    /** The delay attribution code corresponding to the reason why the train was cancelled. */
    canx_reason_code: DelayAttributionCode;
    /** When the cancellation was input to TRUST. */
    canx_timestamp: UnixEpochMsTimestamp;

    /**
     * For an `"OUT OF PLAN"` cancellation,
     *  this is the location that the train should have been according to the schedule.
     */
    orig_loc_stanox?: StanoxCode;
    /**
     * For an "OUT OF PLAN" cancellation,
     *  this is the departure time of the location that the train should have been at according to the schedule.
     */
    orig_loc_timestamp?: UnixEpochMsTimestamp;

    /**
     * The the location that the train is being cancelled from.
     *
     * For an OUT OF PLAN cancellation,
     *  this location will not be in the schedule, but a Train Movement message will have already been sent.
     */
    loc_stanox: StanoxCode;
    /** The departure time at the location that the train is cancelled from. */
    dep_timestamp: UnixEpochMsTimestamp;
}

/**
 * A train cancellation message from the TRUST feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Cancellation}
 */
export interface TrustCancellationMsg extends TrustMsgBase {
    header: TrustCancellationHeader;
    body: TrustCancellationBody;
}

// #endregion

// #region Message 0003 - Movement

/**
 * The header of a train movement message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Movement}
 */
export interface TrustMovementHeader extends TrustMsgHeader {
    msg_type: "0003";
    original_data_source: "GPS" | "SDR" | "SMART" | "TOPS" | "TRUST DA";
}

/**
 * The body of a train movement message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Movement}
 */
export interface TrustMovementBody extends TrustMsgBodyBase {
    toc_id: TocId;
    division_code: TocId;

    event_source: "AUTOMATIC" | "MANUAL" | "SMART";

    event_type: "ARRIVAL" | "DEPARTURE";
    planned_event_type: "ARRIVAL" | "DEPARTURE" | "DESTINATION";

    /** The location at which this event happened */
    loc_stanox: StanoxCode;
    /** The location that generated this report. Can be `"00000"` for manual or off-route reports. */
    reporting_stanox?: StanoxCode;
    /** If the location has been revised, the location in the schedule at activation time. */
    original_loc_stanox?: StanoxCode;

    direction_ind?: "UP" | "DOWN";
    route?: Routing;
    line_ind?: Routing;
    platform?: Routing;

    /** When this event actually happened. */
    actual_timestamp: UnixEpochMsTimestamp;
    /** When this event was planned to occur. */
    planned_timestamp?: UnixEpochMsTimestamp;
    /** The planned GBTT (passenger) time that the event was due to happen at this location. */
    gbtt_timestamp?: UnixEpochMsTimestamp;
    /** The planned time associated with the original location. */
    original_loc_timestamp?: UnixEpochMsTimestamp;

    /** The location at which the next report for this train is due. */
    next_report_stanox?: StanoxCode;
    /** Minutes until next report is expected. */
    next_report_run_time?: `${number}`;

    /** The number of minutes variation from the scheduled time at this location, or `"0"` for off-route reports. */
    timetable_variation: `${number}`;
    variation_status: "EARLY" | "LATE" | "OFF ROUTE" | "ON TIME";

    /** Whether an automatic report is expected for this location. */
    auto_expected?: "true" | "false";
    /** Whether this report is a correction of a previous report. */
    correction_ind: "true" | "false";
    /** Whether this report is for a delay monitoring point. */
    delay_monitoring_point: "true" | "false";
    /** Whether this report is for a location that is not on the train's scheduled route. */
    offroute_ind: "true" | "false";
    /** Whether the train has finished its journey. */
    train_terminated: "true" | "false";
}

/** The body of a train movement message for a train that is at a location in its schedule. */
export interface TrustMovementBodyOnRoute extends TrustMovementBody {
    offroute_ind: "false";
}

/** The body of a train movement message for a train that is at a location that is not in its schedule. */
export interface TrustMovementBodyOffRoute extends TrustMovementBody {
    offroute_ind: "true";
    timetable_variation: "0";
    variation_status: "OFF ROUTE";
    planned_timestamp?: never;
}

/**
 * A train movement message from the TRUST feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Movement}
 */
export interface TrustMovementMsg extends TrustMsgBase {
    header: TrustMovementHeader;
    body: TrustMovementBodyOnRoute | TrustMovementBodyOffRoute;
}

// #endregion

// #region Message 0005 - Reinstatement

/**
 * The header of a train reinstatement message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Reinstatement}
 */
export interface TrustReinstatementHeader extends TrustMsgHeader {
    msg_type: "0005";
    original_data_source: "TOPS" | "SDR" | "TRUST DA";
}

/**
 * The body of a train reinstatement message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Reinstatement}
 */
export interface TrustReinstatementBody extends TrustMsgBodyBase {
    toc_id: TocId;
    division_code: TocId;

    /** The planned time associated with the original location. */
    original_loc_timestamp?: UnixEpochMsTimestamp;
    /** If the location has been revised, the location in the schedule at activation time. */
    original_loc_stanox?: StanoxCode;

    /** The location at which this event happened. */
    loc_stanox: StanoxCode;
    /** When the train was reinstated. */
    reinstatement_timestamp: UnixEpochMsTimestamp;
    /** The planned departure time at the location where the train is being reinstated. */
    dep_timestamp: UnixEpochMsTimestamp;
}

/**
 * A train reinstatement message from the TRUST feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Reinstatement}
 */
export interface TrustReinstatementMsg extends TrustMsgBase {
    header: TrustReinstatementHeader;
    body: TrustReinstatementBody;
}

// #endregion

// #region Message 0006 - Change of Origin

/**
 * The header of a train change of origin message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Change_of_Origin}
 */
export interface TrustChangeOfOriginHeader extends TrustMsgHeader {
    msg_type: "0006";
    original_data_source: "SDR" | "TRUST DA";
}

/**
 * The body of a train change of origin message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Change_of_Origin}
 */
export interface TrustChangeOfOriginBody extends TrustMsgBodyBase {
    toc_id: TocId;
    division_code: TocId;

    /**
     * If the location has been revised, e.g. the new origin is 'out of plan' for the train,
     *  the location in the schedule at activation time.
     */
    original_loc_stanox?: StanoxCode;
    /** The planned time associated with the original location. */
    original_loc_timestamp?: UnixEpochMsTimestamp;

    /** The new origin of the train. */
    loc_stanox: StanoxCode;
    /** When the Change of Origin was entered into TRUST. */
    coo_timestamp: UnixEpochMsTimestamp;
    /** The planned departure time at the new origin. */
    dep_timestamp: UnixEpochMsTimestamp;

    /** The delay attribution code corresponding to the reason for the change of origin. */
    reason_code?: DelayAttributionCode;
}

/**
 * A train change of origin message from the TRUST feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Change_of_Origin}
 */
export interface TrustChangeOfOriginMsg extends TrustMsgBase {
    header: TrustChangeOfOriginHeader;
    body: TrustChangeOfOriginBody;
}

// #endregion

// #region Message 0007 - Change of Identity

/**
 * The header of a train change of identity message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Change_of_Identity}
 */
export interface TrustChangeOfIdentityHeader extends TrustMsgHeader {
    msg_type: "0007";
    original_data_source: "SDR" | "TOPS";
}

/**
 * The body of a train change of identity message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Change_of_Identity}
 */
export interface TrustChangeOfIdentityBody extends TrustMsgBodyBase {
    /** The new identity for this train. */
    revised_train_id: TrustTrainId;
    /** When the identity was changes. */
    event_timestamp: UnixEpochMsTimestamp;
}

/**
 * A train change of identity message from the TRUST feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Change_of_Identity}
 */
export interface TrustChangeOfIdentityMsg extends TrustMsgBase {
    header: TrustChangeOfIdentityHeader;
    body: TrustChangeOfIdentityBody;
}

// #endregion

// #region Message 0008 - Change of Location

/**
 * The header of a train change of location message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Change_of_Location}
 */
export interface TrustChangeOfLocationHeader extends TrustMsgHeader {
    msg_type: "0008";
    original_data_source: "TRUST" | "TOPS";
}

/**
 * The body of a train change of location message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Change_of_Location}
 */
export interface TrustChangeOfLocationBody extends TrustMsgBodyBase {
    /** The new calling point of the train. */
    loc_stanox: StanoxCode;
    /** The original location in the schedule. */
    original_loc_stanox: StanoxCode;

    /** When the change of location was entered into TRUST. */
    event_timestamp: UnixEpochMsTimestamp;
    /** The planned departure time at the location where the train is being reinstated. */
    dep_timestamp: UnixEpochMsTimestamp;
    /** The planned time associated with the original location. */
    original_loc_timestamp: UnixEpochMsTimestamp;
}

/**
 * A train change of location message from the TRUST feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Change_of_Location}
 */
export interface TrustChangeOfLocationMsg extends TrustMsgBase {
    header: TrustChangeOfLocationHeader;
    body: TrustChangeOfLocationBody;
}

// #endregion

// #endregion

/** Any message received from the TRUST feed. */
export type TrustMessage =
    | TrustCallMsg
    | TrustCancellationMsg
    | TrustMovementMsg
    | TrustReinstatementMsg
    | TrustChangeOfOriginMsg
    | TrustChangeOfIdentityMsg
    | TrustChangeOfLocationMsg;

/** A mapping of TRUST message types to their corresponding message interfaces. */
export type TrustMsgTypeMap = {
    "0001": TrustCallMsg;
    "0002": TrustCancellationMsg;
    "0003": TrustMovementMsg;
    "0005": TrustReinstatementMsg;
    "0006": TrustChangeOfOriginMsg;
    "0007": TrustChangeOfIdentityMsg;
    "0008": TrustChangeOfLocationMsg;
};