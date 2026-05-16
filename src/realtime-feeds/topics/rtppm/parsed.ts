export interface PublicPerformanceMeasure {
    /** Current performance percentage as an integer (rounded down) between -1 and 100. */
    performancePercentage: number;
    /**
     * A colour-coded rating of the performance level:
     * - `'G'` - Green/Good
     * - `'A'` - Amber/Average
     * - `'R'` - Red/Poor
     * - `'W'` - White/Unknown
     */
    rag: "G" | "A" | "R" | "W";
    /**
     * Trend Indicator.
     * - `'+'` - Rising trend
     * - `'='` - No change (flat)
     * - `'-'` - Falling trend
     */
    trend?: "+" | "=" | "-";

    /** @example "Y" */ // "N" is probably possible, but it isn't documented and I haven't observed it
    displayFlag?: string;
    /** @example "Y" */ // "N" is probably possible, but it isn't documented and I haven't observed it
    ragDisplayFlag?: string;
}

export interface RecordWithPPM {
    /** Total number of trains. */
    total: number;
    /**
     * The PPM calculated based on trains which have arrived at their destination during the current PPM day.
     *
     * A PPM day runs from 0200 to 0159 the next day.
     * - If a train starts its journey before midnight but doesn't arrive at its destination until after 0159,
     *   it will not be counted in the day's figures.
     * - If a train starts after midnight and finishes after 2am,
     *   it will be counted in the day's figures.
     */
    ppm: PublicPerformanceMeasure;
    /** The PPM calculated based on trains which have arrived at their destination in the last 2 hours. */
    rollingPPM: PublicPerformanceMeasure;
}

export interface RecordWithSplits {
    /** Total number of trains. */
    total: number;
    /** Number of trains on time. */
    onTime: number;
    /** Number of trains late. */
    late: number;
    /** Number of trains cancelled or more than 29 minutes late. */
    cancelledOrVeryLate: number;
}

export interface DetailedPerformanceRecord extends RecordWithPPM, RecordWithSplits {}

export interface Operator extends RecordWithPPM {
    /**
     * 2-digit sector code used to represent the TOC in TRUST, or a 3-letter code.
     *
     * @example "65"
     * @example "SWT"
     */
    code: string;
    /**
     * The name of the TOC.
     *
     * @example "Avanti West Coast"
     */
    name: string;
    /**
     * The key character used to display different performance thresholds.
     *
     * - `^` - Trains must arrive within 5 minutes of their scheduled time to be considered on time.
     * - `*` - Trains must arrive within 10 minutes of their scheduled time to be considered on time.
     */
    keySymbol?: string;
}

export interface WebPage {
    /** The maximum period of time (in seconds) the data should be displayed */
    webDisplayPeriod?: number;
    /**
     * Static message to show on a web page
     *
     * @example "The Public Performance Measure shows the performance of trains against the timetable, measured as the percentage of trains arriving at destination 'on time'."
     */
    webFixedMsg1?: string;
    /**
     * Static message to show on a web page
     *
     * @example "The Public Performance Measure shows the performance of trains against the timetable, measured as the percentage of trains arriving at destination 'on time'."
     */
    webFixedMsg2?: string;
}

export interface OocPage extends WebPage {
    operators: Operator[];
}

export interface NationalPage extends OocPage {
    nationalPPM: DetailedPerformanceRecord;
    sectors: {
        /** PPM for the sector. */
        ppm: DetailedPerformanceRecord;
        /** Code of the sector. */
        code: string;
        /** Description of the sector. */
        description: string;
    }[];

    webMsgOfMoment?: string;
    /** @example "N" */ // "Y" is probably possible, but it isn't documented and I haven't observed it
    staleFlag?: string;
}

/** Page for freight operators. */
export interface FocPage extends OocPage {
    nationalPPM: Omit<DetailedPerformanceRecord, 'cancelledOrVeryLate'>;
}

export interface OperatorToleranceTotal extends RecordWithSplits {
    timeband: number;
}

export interface OperatorServiceGroup extends OperatorToleranceTotal, DetailedPerformanceRecord {
    /** Name of the service group. */
    name: string;
    /** Code of the sector the service group is related to. */
    sectorCode?: string;
}

export interface OperatorPage {
    detail: Operator & DetailedPerformanceRecord;
    toleranceTotals: OperatorToleranceTotal[];
    serviceGroups: OperatorServiceGroup[];
}

/**
 * A message from the RTPPM feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/RTPPM}
 */
export interface RtppmData {
    /** When the report was created. */
    snapshotDate: Date;
    /** @example "http://connect/Performance/PPM/PPMGuide.doc x" */
    webPpmUrl?: string;
    systemMessage?: string;

    ppt: PublicPerformanceMeasure;
    /** Thresholds mapping performance categories to boundaries. */
    ragThresholds: {
        /** @example "RTM_PUNC_TT15" */
        type: string;
        good: number;
        medium: number;
    }[];
    nationalPage: NationalPage;
    oocPage: OocPage;
    focPage?: FocPage;
    commonOperatorPage: WebPage;
    operatorPages: OperatorPage[];
}
