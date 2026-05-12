import {BerthName, Routing, StanoxCode} from "../../types";
import {TrainDescriberId} from "../../kafka-feeds/train-describer";

/** A mapping from a berth event (step) to how to interpret it. */
export interface SmartStep {
    // Inputs

    /**
     * A type of step that could result in the description moving from the FROMBERTH to the TOBERTH.
     * https://wiki.openraildata.com/index.php/SmartBerthDetail#Step_Types
     */
    STEPTYPE: "B" | "C" | "I" | "F" | "T" | "D" | "E",
    /** The train describer the berths are associated with. */
    TD: TrainDescriberId,
    /** The berth at the start of the step. */
    FROMBERTH: BerthName,
    /** The berth at the end of the step. */
    TOBERTH: BerthName,

    /// Outputs

    /**
     * The type of event that could cause the description to move from the FROMBERTH to the TOBERTH.
     * https://wiki.openraildata.com/index.php/SmartBerthDetail#Event_Types
     */
    EVENT: "A" | "B" | "C" | "D",
    /**
     * STANOX code for the location of the step
     * https://wiki.openraildata.com/index.php/STANOX
     */
    STANOX: `${StanoxCode}`,
    /** Abbreviated description of location */
    STANME: string
    /** The platform number associated with the step, if applicable. */
    PLATFORM: Routing | "",
    /** The line associated with the end of the step, if applicable. */
    FROMLINE: Routing | "",
    /** The line associated with the start of the step, if applicable. */
    TOLINE: Routing | "",
    /** The route associated with the step, if applicable. */
    ROUTE: Routing | "",

    /** Difference between the time the berth event occurs and the time to be recorded in TRUST, in seconds. */
    BERTHOFFSET: `+${number}` | `-${number}`,

    /** Always seems to be a date in `DD/MM/YYYY` format, but presumably an arbitrary comment could be added here. */
    COMMENT: string,
}

/** Contents of the SMART JSON file */
export interface SmartExtract {
    BERTHDATA: SmartStep[];
}
