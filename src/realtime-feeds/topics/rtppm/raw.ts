import {EnvelopedMessage} from "../../shared-message-envelope/raw";
import {UnixEpochMsTimestamp} from "../../../types";

export interface PublicPerformanceMeasure {
    /** Current performance percentage as an integer (rounded down) between -1 and 100. */
    text: `${number}`;
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
    trendInd?: "+" | "=" | "-";

    /** @example "Y" */ // "N" is probably possible, but it isn't documented and I haven't observed it
    displayFlag?: string;
    /** @example "Y" */ // "N" is probably possible, but it isn't documented and I haven't observed it
    ragDisplayFlag?: string;
}

export interface RagThreshold {
    /** @example "RTM_PUNC_TT15" */
    type: string;
    good: `${number}`;
    medium: `${number}`;
}

export interface RecordWithPPM {
    /** Total number of trains. */
    Total: `${number}`;
    /**
     * The PPM calculated based on trains which have arrived at their destination during the current PPM day.
     *
     * A PPM day runs from 0200 to 0159 the next day.
     * - If a train starts its journey before midnight but doesn't arrive at its destination until after 0159,
     *   it will not be counted in the day's figures.
     * - If a train starts after midnight and finishes after 2am,
     *   it will be counted in the day's figures.
     */
    PPM: PublicPerformanceMeasure;
    /** The PPM calculated based on trains which have arrived at their destination in the last 2 hours. */
    RollingPPM: PublicPerformanceMeasure;
}

export interface RecordWithSplits {
    /** Total number of trains. */
    Total: `${number}`;
    /** Number of trains on time. */
    OnTime: `${number}`;
    /** Number of trains late. */
    Late: `${number}`;
    /** Number of trains cancelled or more than 29 minutes late. */
    CancelVeryLate: `${number}`;
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
    keySymbol?: "^" | "*";
}

export interface Sector {
    /** PPM for the sector. */
    SectorPPM: DetailedPerformanceRecord;
    /** Code of the sector. */
    sectorCode: string;
    /** Description of the sector. */
    sectorDesc: string;
}

export interface WebPage {
    /** The maximum period of time (in seconds) the data should be displayed */
    WebDisplayPeriod?: `${number}`;
    /**
     * Static message to show on a web page
     *
     * @example "The Public Performance Measure shows the performance of trains against the timetable, measured as the percentage of trains arriving at destination 'on time'."
     */
    WebFixedMsg1?: string;
    /**
     * Static message to show on a web page
     *
     * @example "The Public Performance Measure shows the performance of trains against the timetable, measured as the percentage of trains arriving at destination 'on time'."
     */
    WebFixedMsg2?: string;
}

export interface OocPage extends WebPage {
    Operator: Operator | Operator[];
}

export interface NationalPage extends OocPage {
    NationalPPM: DetailedPerformanceRecord;
    Sector?: Sector | Sector[];

    WebMsgOfMoment?: string;
    /** @example "N" */ // "Y" is probably possible, but it isn't documented and I haven't observed it
    StaleFlag?: string;
}

/** Page for freight operators. */
export interface FocPage extends OocPage {
    NationalPPM: Omit<DetailedPerformanceRecord, 'CancelVeryLate'>;
}

export interface OperatorDetail extends Operator, DetailedPerformanceRecord {}

export interface OperatorToleranceTotal extends RecordWithSplits {
    timeband: `${number}`;
}

export interface OperatorServiceGroup extends OperatorToleranceTotal, DetailedPerformanceRecord {
    /** Name of the service group. */
    name: string;
    /** Code of the sector the service group is related to. */
    sectorCode?: string;
}

export interface OperatorPage {
    Operator: OperatorDetail;
    OprToleranceTotal?: OperatorToleranceTotal | OperatorToleranceTotal[];
    OprServiceGrp?: OperatorServiceGroup | OperatorServiceGroup[];
}

/**
 * A message from the RTPPM feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/RTPPM}
 */
export interface RtppmData {
    /** When the report was created. */
    snapshotTStamp: UnixEpochMsTimestamp;
    /** @example "http://connect/Performance/PPM/PPMGuide.doc x" */
    WebPPMLink?: string;
    SystemMsg?: string;

    PPT: PublicPerformanceMeasure;
    /** Thresholds mapping performance categories to boundaries. */
    RAGThresholds?: RagThreshold | RagThreshold[];
    NationalPage: NationalPage;
    OOCPage: OocPage;
    FOCPage?: FocPage;
    CommonOperatorPage: WebPage;
    OperatorPage?: OperatorPage | OperatorPage[];
}

/** The raw message wrapper for the RTPPM feed. */
export interface RtppmMessageWrapper {
    RTPPMDataMsgV1: EnvelopedMessage<'RTPPMData', RtppmData>;
}
