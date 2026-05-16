import {StpIndicator, TrainServiceCode, TrainUID} from "../../../static/schedule/cif";
import {StanoxCode, Routing, Headcode} from "../../../types";

// #region Core

/** The parts of a TRUST train ID, extracted from the value of a `TrustTrainId` instance. */
type TrustTrainIdParts = {
    originStanoxArea: string;
    headcode: Headcode;
    tspeed: string;
    callCode: string;
    day: number;
};

/**
 * 10-character alphanumeric code uniquely identifying a train service, allocated during activation.
 * The exact format of the train ID is not enforced by this class' constructor,
 *  but is expected to follow the pattern described below.
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
export class TrustTrainId {
    /**
     * Memoized parts of the train ID, parsed from the value when `parts()` is called for the first time.
     * Null if the value does not match the expected pattern.
     * Undefined if not yet parsed.
     */
    private _parts?: TrustTrainIdParts | null;

    /**
     * Creates a new TrustTrainId instance.
     *
     * @param value The 10-character alphanumeric train ID string. Should match the pattern `^\d\d[A-Z0-9]{6}\d\d$`, but this is not enforced by the constructor.
     */
    constructor(public readonly value: string) {}

    toString() {
        return this.value;
    }

    toJSON() {
        return this.value;
    }

    private parseParts(): void {
        if (this._parts === undefined) {
            const match = /^(\d\d)([A-Z0-9]{4})([A-Z0-9])([A-Z0-9])(\d\d)$/.exec(this.value);
            this._parts = match ? {
                originStanoxArea: match[1],
                headcode: match[2],
                tspeed: match[3],
                callCode: match[4],
                day: +match[5],
            } : null;
        }
    }

    /**
     * Checks if the train ID value matches the expected pattern.
     *
     * @returns `true` if the value matches the expected pattern, `false` otherwise.
     */
    get isValid(): boolean {
        this.parseParts();
        return this._parts !== null;
    }

    /**
     * Parses the train ID into its component parts based on the expected pattern.
     *
     * @returns An object containing the stanoxArea, headcode, tspeed, callCode, and day extracted from the train ID.
     * @throws Error if the train ID does not match the expected pattern.
     */
    parts(): TrustTrainIdParts {
        this.parseParts();
        if (this._parts) return this._parts;
        throw new Error(`TrustTrainId value "${this.value}" does not match expected pattern`);
    }

    /**
     * The first two digits of the origin STANOX, indicating the area where the train starts,
     *  extracted from the TRUST train ID.
     *
     * @returns The origin STANOX area.
     * @throws Error if the train ID does not match the expected pattern.
     */
    get originStanoxArea(): string {
        return this.parts().originStanoxArea;
    }

    /**
     * The train identity (headcode) extracted from the TRUST train ID.
     *
     * @returns The headcode.
     * @throws Error if the train ID does not match the expected pattern.
     */
    get headcode(): Headcode {
        return this.parts().headcode;
    }

    /**
     * The TSPEED (train status code) of the train extracted from the TRUST train ID.
     *
     * @see {@link https://wiki.openraildata.com/index.php/TSPEED} for valid TSPEED values and their meanings.
     * @returns The TSPEED.
     * @throws Error if the train ID does not match the expected pattern.
     */
    get tspeed(): string {
        return this.parts().tspeed;
    }

    /**
     * The Call Code of the train, which indicates the time of day that the train departs from its origin,
     *  extracted from the TRUST train ID.
     *
     * @see {@link https://wiki.openraildata.com/index.php/Call_Code} for valid Call Code values and their meanings.
     * @returns The Call Code.
     * @throws Error if the train ID does not match the expected pattern.
     */
    get callCode(): string {
        return this.parts().callCode;
    }

    /**
     * The day of the month on which the train originated, extracted from the TRUST train ID.
     *
     * @returns The day of the month on which the train originated.
     * @throws Error if the train ID does not match the expected pattern.
     */
    get day(): number {
        return this.parts().day;
    }
}

/** 2-digit code uniquely identifying the Train Operating Company (TOC) that operates the train service. */
export type TocId = `${number}`;

/**
 * 2-character alphanumeric code indicating the reason for a cancellation or change of origin.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Delay_Attribution_Guide}
 */
export type DelayAttributionCode = string;

/** The type of a message from the TRUST feed. */
export type TrustMsgType =
    | "CALL"
    | "CANCELLATION"
    | "MOVEMENT"
    | "REINSTATEMENT"
    | "CHANGE OF ORIGIN"
    | "CHANGE OF IDENTITY"
    | "CHANGE OF LOCATION";

/** The header of a message from the TRUST feed. */
export interface TrustMsgHeader {
    msgType: TrustMsgType;
    /** When the message was pushed to the queue. */
    msgQueueTimestamp: Date;
    /**
     * LATA or CICS Session of the inputting terminal.
     *
     * @see {@link https://wiki.openraildata.com/index.php/LATA}
     * @see {@link https://wiki.openraildata.com/index.php/CICS_Session}
     */
    sourceDevId?: string;
    /**
     * NCI signon of the inputting user.
     *
     * @see {@link https://wiki.openraildata.com/index.php/NCI_signon}
     */
    userId?: string;
    originalDataSource?: string;
}

/** Base structure for the body of any message from the TRUST feed. */
export interface TrustMsgBodyBase {
    /**
     * The unique train ID allocated at call/activation time,
     *  which will be the same for all messages relating to the same train,
     *  even if the train changes identity later in its journey.
     */
    trainId: TrustTrainId;
    /**
     * If the train has previously changed identity,
     *  this field will contain the revisedTrainId from the most recent Change of Identity message for this train.
     */
    currentTrainId?: TrustTrainId;
    trainFileAddress?: string;
    trainServiceCode: TrainServiceCode;
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
    msgType: "CALL";
    originalDataSource: "TSIA";
    source_dev_id?: never;
    user_id?: never;
}

/**
 * The body of a train call/activation message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Activation}
 */
export interface TrustCallBody extends TrustMsgBodyBase {
    currentTrainId?: never;

    tocId: TocId;

    /** C from CIF/ITPS, V from VSTP/TOPS */
    scheduleSource: "C" | "V";
    /** Either `"00000"` for a CIF/ITPS schedule, or the TOPS unique ID of the schedule. */
    d1266RecordNumber: `${number}`;

    /** Start date of the schedule */
    scheduleStartDate: Temporal.PlainDate;
    /** End date of the schedule. */
    scheduleEndDate: Temporal.PlainDate;
    /** Train identity (headcode) and TSPEED value. */
    scheduleWttId: string;
    scheduleType: StpIndicator;
    trainUid: TrainUID;

    /** Whether the train was called manually by the operator, as opposed to automatically by TRUST. */
    isManualCall: boolean;
    
    /** When the train was originally created in TRUST. */
    creationTimestamp: Date;
    /** When the train is scheduled to start its journey according to the WTT. */
    originDepartureTimestamp: Date;
    /**
     * When the train is scheduled to start its journey.
     * This may be the day after it is called if called before midnight and scheduled to start after midnight.
     *
     * There is a known problem with this value for trains that
     *  start their journey between 0001 and 0200 the next day during daylight savings.
     * To work around this, it is recommended to use the date in the originDepartureTimestamp field.
     */
    currentOriginTimestamp: Temporal.PlainDate;

    /** Where the train is scheduled to start. */
    scheduledOrigin: StanoxCode;
    /** The origin location when different to the original schedule. */
    currentOrigin?: StanoxCode;
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
    msgType: "CANCELLATION";
    originalDataSource?: "TOPS" | "SDR" | "TRUST DA" | "TM ROC 30" | "";
}

/**
 * The body of a train cancellation message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Cancellation}
 */
export interface TrustCancellationBody extends TrustMsgBodyBase {
    currentTrainId?: never;

    tocId: TocId;
    divisionCode: TocId;

    /** How far into its journey the train was when it was cancelled. */
    cancellationType: "AT ORIGIN" | "EN ROUTE" | "ON CALL" | "OUT OF PLAN";
    /** The delay attribution code corresponding to the reason why the train was cancelled. */
    cancellationReason: DelayAttributionCode;
    /** When the cancellation was input to TRUST. */
    cancellationTimestamp: Date;

    /**
     * For an `"OUT OF PLAN"` cancellation,
     *  this is the location that the train should have been according to the schedule.
     */
    originalLocation?: StanoxCode;
    /**
     * For an "OUT OF PLAN" cancellation,
     *  this is the departure time of the location that the train should have been at according to the schedule.
     */
    originalLocationTimestamp?: Date;

    /**
     * The location that the train is being cancelled from.
     *
     * For an OUT OF PLAN cancellation,
     *  this location will not be in the schedule, but a Train Movement message will have already been sent.
     */
    location: StanoxCode;
    /** The departure time at the location that the train is cancelled from. */
    departureTimestamp: Date;
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
    msgType: "MOVEMENT";
    originalDataSource: "GPS" | "SDR" | "SMART" | "TOPS" | "TRUST DA";
}

/**
 * The body of a train movement message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Movement}
 */
export interface TrustMovementBody extends TrustMsgBodyBase {
    tocId: TocId;
    divisionCode: TocId;

    eventSource: "AUTOMATIC" | "MANUAL" | "SMART";

    eventType: "ARRIVAL" | "DEPARTURE";
    plannedEventType: "ARRIVAL" | "DEPARTURE" | "DESTINATION";

    /** The location at which this event happened */
    location: StanoxCode;
    /** The location that generated this report. Can be `"00000"` for manual or off-route reports. */
    reportingLocation?: StanoxCode;
    /** If the location has been revised, the location in the schedule at activation time. */
    originalLocation?: StanoxCode;

    direction?: "UP" | "DOWN";
    route?: Routing;
    line?: Routing;
    platform?: Routing;

    /** When this event actually happened. */
    actualTimestamp: Date;
    /** When this event was planned to occur. */
    plannedTimestamp?: Date;
    /** The planned GBTT (passenger) time that the event was due to happen at this location. */
    gbttTimestamp?: Date;
    /** The planned time associated with the original location. */
    originalLocationTimestamp?: Date;

    /** The location at which the next report for this train is due. */
    nextReportLocation?: StanoxCode;
    /** Minutes until next report is expected. */
    minutesUntilNextReport?: number;

    /** The number of minutes variation from the scheduled time at this location, or `"0"` for off-route reports. */
    timetableVariation: number;
    variationStatus: "EARLY" | "LATE" | "OFF ROUTE" | "ON TIME";

    /** Whether an automatic report is expected for this location. */
    isAutomaticReportExpected?: boolean;
    /** Whether this report is a correction of a previous report. */
    isCorrection: boolean;
    /** Whether this report is for a delay monitoring point. */
    isDelayMonitoringPoint: boolean;
    /** Whether the train has finished its journey. */
    isTrainTerminated: boolean;
}

/** The body of a train movement message for a train that is at a location in its schedule. */
export interface TrustMovementBodyOnRoute extends TrustMovementBody {
    variationStatus: "EARLY" | "LATE" | "ON TIME";
}

/** The body of a train movement message for a train that is at a location that is not in its schedule. */
export interface TrustMovementBodyOffRoute extends TrustMovementBody {
    variationStatus: "OFF ROUTE";
    timetableVariation: 0;
    plannedTimestamp?: never;
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
    msgType: "REINSTATEMENT";
    originalDataSource: "TOPS" | "SDR" | "TRUST DA";
}

/**
 * The body of a train reinstatement message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Reinstatement}
 */
export interface TrustReinstatementBody extends TrustMsgBodyBase {
    tocId: TocId;
    divisionCode: TocId;

    /** The planned time associated with the original location. */
    originalLocationTimestamp?: Date;
    /** If the location has been revised, the location in the schedule at activation time. */
    originalLocation?: StanoxCode;

    /** The location at which this event happened. */
    location: StanoxCode;
    /** When the train was reinstated. */
    reinstatementTimestamp: Date;
    /** The planned departure time at the location where the train is being reinstated. */
    departureTimestamp: Date;
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
    msgType: "CHANGE OF ORIGIN";
    originalDataSource: "SDR" | "TRUST DA";
}

/**
 * The body of a train change of origin message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Change_of_Origin}
 */
export interface TrustChangeOfOriginBody extends TrustMsgBodyBase {
    tocId: TocId;
    divisionCode: TocId;

    /**
     * If the location has been revised, e.g. the new origin is 'out of plan' for the train,
     *  the location in the schedule at activation time.
     */
    originalLocation?: StanoxCode;
    /** The planned time associated with the original location. */
    originalLocationTimestamp?: Date;

    /** The new origin of the train. */
    newOrigin: StanoxCode;
    /** When the Change of Origin was entered into TRUST. */
    eventTimestamp: Date;
    /** The planned departure time at the new origin. */
    departureTimestamp: Date;

    /** The delay attribution code corresponding to the reason for the change of origin. */
    reasonCode?: DelayAttributionCode;
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
    msgType: "CHANGE OF IDENTITY";
    originalDataSource: "SDR" | "TOPS";
}

/**
 * The body of a train change of identity message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Change_of_Identity}
 */
export interface TrustChangeOfIdentityBody extends TrustMsgBodyBase {
    /** The new identity for this train. */
    revisedTrainId: TrustTrainId;
    /** When the identity was changes. */
    eventTimestamp: Date;
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
    msgType: "CHANGE OF LOCATION";
    originalDataSource: "TRUST" | "TOPS";
}

/**
 * The body of a train change of location message.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Change_of_Location}
 */
export interface TrustChangeOfLocationBody extends TrustMsgBodyBase {
    /** The new calling point of the train. */
    newLocation: StanoxCode;
    /** The original location in the schedule. */
    originalLocation: StanoxCode;

    /** When the change of location was entered into TRUST. */
    eventTimestamp: Date;
    /** The planned departure time at the location where the train is being reinstated. */
    departureTimestamp: Date;
    /** The planned time associated with the original location. */
    originalLocationTimestamp: Date;
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
    "CALL": TrustCallMsg;
    "CANCELLATION": TrustCancellationMsg;
    "MOVEMENT": TrustMovementMsg;
    "REINSTATEMENT": TrustReinstatementMsg;
    "CHANGE OF ORIGIN": TrustChangeOfOriginMsg;
    "CHANGE OF IDENTITY": TrustChangeOfIdentityMsg;
    "CHANGE OF LOCATION": TrustChangeOfLocationMsg;
};
