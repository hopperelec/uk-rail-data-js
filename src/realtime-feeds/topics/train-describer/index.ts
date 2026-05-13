import {RawTrainDescriberMsg, TrainDescriberMsg} from "./types";
export * from "./types";

/**
 * Parses a raw message from the Train Describer feed into a more usable format.
 *
 * Under the hood, all this function does is convert the `time` into a JavaScript Date object,
 *  accounting for the known cross-midnight bug.
 *
 * @see {@link https://wiki.openraildata.com/index.php/TD#Cross-midnight_bug}
 * @param rawMessage The RawTrainDescriberMsg object received from the feed.
 * @returns A parsed TrainDescriberMsg object.
 * @throws Error if the input message does not appear to be in the expected format.
 */
export function parseTrainDescriberMessage(rawMessage: RawTrainDescriberMsg): TrainDescriberMsg {
    if (!(rawMessage.time && typeof rawMessage.time === 'string')) {
        throw new Error(`Invalid message format: expected 'time' field to be a string, got ${typeof rawMessage.time}`);
    }
    let timeNum = +rawMessage.time;
    const HOUR_IN_MS = 60 * 60 * 1000;
    if (timeNum > Date.now() + 12 * HOUR_IN_MS) {
        // If the timestamp is more than 12 hours in the future,
        //  it's likely because of the cross-midnight bug, so subtract 24 hours
        timeNum -= 24 * HOUR_IN_MS;
    }
    return { ...rawMessage, time: new Date(timeNum) };
}
