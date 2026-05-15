import { UnixEpochMsTimestamp } from "../../../types";

/** Name of a route group. */
export type RouteGroupName =
    | "Scotland"
    | "London North Western (South)"
    | "East Midlands"
    | "Anglia"
    | "Western and Wales"
    | "London North Western (North)"
    | "Kent & Sussex"
    | "Wessex"
    | "London North Eastern";

/** An individual Temporary Speed Restriction (TSR). */
export interface TemporarySpeedRestriction {
    /** Identifier of the TSR. */
    TSRID: string;
    /**
     * The reference of this TSR.
     *
     * @example "T2013/105556"
     */
    TSRReference: string;

    /** When the TSR was originally created. */
    creationDate: UnixEpochMsTimestamp;
    publishDate: UnixEpochMsTimestamp;
    /** When the TSR starts/started. */
    ValidFromDate: UnixEpochMsTimestamp;
    /** When the TSR ends/ended. */
    ValidToDate: UnixEpochMsTimestamp;

    publishEvent: string;

    /** Name of the route group. */
    RouteGroupName: RouteGroupName;
    /**
     * Alphanumeric code representing a specific route.
     *
     * @example "SW105"
     * @see {@link https://wiki.openraildata.com/index.php/RouteCode}
     */
    RouteCode: string;
    /** @example "701" */
    RouteOrder: string;

    /**
     * Full name of the location at which the TSR begins.
     *
     * @example "Wool"
     */
    FromLocation: string;
    /**
     * Full name of the location at which the TSR ends.
     *
     * @example "Wool"
     */
    ToLocation: string;

    /** Start date of the TSR, formatted according to Weekly Operating Notice dates. */
    WONValidFrom?: string;
    /** End date of the TSR, formatted according to Weekly Operating Notice dates. */
    WONValidTo?: string;

    /**
     * Name of the line to which the TSR applies.
     *
     * @example "Up"
     */
    LineName: string;
    /** Line direction in which the TSR is applicable. */
    Direction: "up" | "down";
    /** Sub-unit type. */
    SubunitType: "yards" | "chains";
    /** Mileage of the start of the TSR on this line. */
    MileageFrom: `${number}`;
    /** Sub-unit (yards or chains) of the start of the TSR on this line. */
    SubunitFrom: `${number}`;
    /** Mileage of the end of the TSR on this line. */
    MileageTo: `${number}`;
    /** Sub-unit (yards or chains) of the end of the TSR on this line. */
    SubunitTo: `${number}`;
    /** Whether the TSR may be moved progressively along the line. */
    MovingMileage: "true" | "false";

    /** Maximum permitted speed for a passenger train through the TSR (in mph). */
    PassengerSpeed: `${number}`;
    /** Maximum permitted speed for a freight train through the TSR (in mph). */
    FreightSpeed: `${number}`;

    /**
     * Reason for the TSR.
     *
     * @example "Condition Of Track"
     */
    Reason: string;
    /**
     * Name of the requesting party.
     *
     * @example "Network Rail Wessex (Eastleigh MDUM)"
     */
    Requestor: string;
    /** Comments associated with the TSR. */
    Comments: string | null;
}

/**
 * Current TSR batch message payload.
 *
 * @see {@link https://wiki.openraildata.com/index.php/TSR}
 */
export interface TsrBatchMsg {
    /** @example "http://xml.hiav.networkrail.co.uk/schema/net/tsr/1 net_tsr_messaging_v1.xsd" */
    schemaLocation: string;
    /** @example "Network Rail" */
    owner: string;
    /** When the message was generated. */
    timestamp: UnixEpochMsTimestamp;
    /** @example "2015-02-02T09:18:23.718+00:00-9PPS" */
    originMsgId: string;
    /** @example "industry" */
    classification: string;
    /** @example "Production" */
    systemEnvironmentCode: string;

    Sender: {
        /** @example "Network Rail" */
        organisation: string;
        /** @example "HUB" */
        application: string;
        /** @example "net" */
        applicationDomain: string;
        instance: string;
        component: string;
        userID: string;
        sessionID: string;
        conversationID: string;
        messageID: string;
    };

    Publication: {
        /** @example "TSR/9" */
        TopicID: string;
    };

    TSRBatchMsg: {
        /** Name of the route group these TSRs belong to. */
        routeGroup: RouteGroupName;
        /** Numeric code of the route group. */
        routeGroupCode: `${number}`;
        /**
         * Identifier of Weekly Operating Notice.
         *
         * @example "WON_1415_46_F"
         */
        publishSource: string;
        /** @example "full" */
        routeGroupCoverage: string;
        /** @example "publishWON" */
        batchPublishEvent: string;

        /** When the Weekly Operating Notice was published. */
        publishDate: UnixEpochMsTimestamp;
        /** Start of the Weekly Operating Notice period. */
        WONStartDate: UnixEpochMsTimestamp;
        /** End of the Weekly Operating Notice period. */
        WONEndDate: UnixEpochMsTimestamp;

        /** All TSRs in this batch. */
        tsr: TemporarySpeedRestriction[];
    };
}

/**
 * The raw message wrapper for the TSR feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/TSR}
 */
export interface TsrMessageWrapper {
    TSRBatchMsgV1: TsrBatchMsg;
}