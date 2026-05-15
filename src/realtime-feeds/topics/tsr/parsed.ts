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
    id: string;
    /**
     * The reference of this TSR.
     *
     * @example "T2013/105556"
     */
    ref: string;

    /** When the TSR was originally created. */
    creationDate: Date;
    publishDate: Date;
    /** When the TSR starts/started. */
    validFromDate: Date;
    /** When the TSR ends/ended. */
    validToDate: Date;

    /** Start date of the TSR, formatted according to Weekly Operating Notice dates. */
    wonValidFrom?: string;
    /** End date of the TSR, formatted according to Weekly Operating Notice dates. */
    wonValidTo?: string;

    publishEvent: string;

    /** Name of the route group. */
    routeGroup: RouteGroupName;
    /**
     * Alphanumeric code representing a specific route.
     *
     * @example "SW105"
     * @see {@link https://wiki.openraildata.com/index.php/RouteCode}
     */
    routeCode: string;
    /** @example "701" */
    routeOrder: string;

    /**
     * Full name of the location at which the TSR begins.
     *
     * @example "Wool"
     */
    fromLocation: string;
    /**
     * Full name of the location at which the TSR ends.
     *
     * @example "Wool"
     */
    toLocation: string;

    /**
     * Name of the line to which the TSR applies.
     *
     * @example "Up"
     */
    lineName: string;
    /** Line direction in which the TSR is applicable. */
    direction: "up" | "down";
    /** The unit of measurement for the sub-units of mileage used in this TSR. */
    subunitType: "yards" | "chains";
    /** Mileage of the start of the TSR on this line. */
    mileageFrom: number;
    /** Sub-unit (yards or chains) of the start of the TSR on this line. */
    subunitFrom: number;
    /** Mileage of the end of the TSR on this line. */
    mileageTo: number;
    /** Sub-unit (yards or chains) of the end of the TSR on this line. */
    subunitTo: number;
    /** Whether the TSR may be moved progressively along the line. */
    movingMileage: boolean;

    /** Maximum permitted speed for a passenger train through the TSR (in mph). */
    passengerSpeed: number;
    /** Maximum permitted speed for a freight train through the TSR (in mph). */
    freightSpeed: number;

    /**
     * Reason for the TSR.
     *
     * @example "Condition Of Track"
     */
    reason: string;
    /**
     * Name of the requesting party.
     *
     * @example "Network Rail Wessex (Eastleigh MDUM)"
     */
    requestor: string;
    /** Comments associated with the TSR. */
    comments?: string;
}

/**
 * Batch of TSRs.
 *
 * @see {@link https://wiki.openraildata.com/index.php/TSR}
 */
export interface TsrBatchMsg {
    /** @example "Network Rail" */
    owner: string;
    /** When the message was generated. */
    timestamp: Date;
    /** @example "2015-02-02T09:18:23.718+00:00-9PPS" */
    originMsgId: string;
    /** @example "industry" */
    classification: string;
    /** @example "Production" */
    systemEnvironmentCode: string;

    sender: {
        /** @example "Network Rail" */
        organisation: string;
        /** @example "HUB" */
        application: string;
        /** @example "net" */
        applicationDomain: string;
        instance: string;
        component: string;
        userId: string;
        sessionId: string;
        conversationId: string;
        messageId: string;
    };

    /** @example "TSR/9" */
    topicId: string;

    /** Name of the route group these TSRs belong to. */
    routeGroup: RouteGroupName;
    /** Numeric code of the route group. */
    routeGroupCode: number;
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
    publishDate: Date;
    /** Start of the Weekly Operating Notice period. */
    wonStartDate: Date;
    /** End of the Weekly Operating Notice period. */
    wonEndDate: Date;

    /** All TSRs in this batch. */
    batch: TemporarySpeedRestriction[];
}
