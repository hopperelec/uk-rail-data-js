import * as RawTD from './raw';
import * as ParsedTD from './parsed';
export * as RawTD from './raw';
export * as ParsedTD from './parsed';

const MESSAGE_TYPE_MAP = {
    'CA': 'BERTH STEP',
    'CB': 'BERTH CANCEL',
    'CC': 'BERTH INTERPOSE',
    'CT': 'HEARTBEAT',
    'SF': 'SIGNALLING UPDATE',
    'SG': 'SIGNALLING REFRESH',
    'SH': 'SIGNALLING REFRESH FINISHED',
} as const satisfies Record<RawTD.TrainDescriberMsgType, ParsedTD.TrainDescriberMsgType>;

export function parseTrainDescriberMessage(rawMessage: RawTD.CaMsg): ParsedTD.BerthStepMsg;
export function parseTrainDescriberMessage(rawMessage: RawTD.CbMsg): ParsedTD.BerthCancelMsg;
export function parseTrainDescriberMessage(rawMessage: RawTD.CcMsg): ParsedTD.BerthInterposeMsg;
export function parseTrainDescriberMessage(rawMessage: RawTD.CtMsg): ParsedTD.HeartbeatMsg;
export function parseTrainDescriberMessage(rawMessage: RawTD.SfMsg): ParsedTD.SignallingUpdateMsg;
export function parseTrainDescriberMessage(rawMessage: RawTD.SgMsg): ParsedTD.SignallingRefreshMsg;
export function parseTrainDescriberMessage(rawMessage: RawTD.ShMsg): ParsedTD.SignallingRefreshFinishedMsg;
export function parseTrainDescriberMessage(rawMessage: RawTD.TrainDescriberMsg): ParsedTD.TrainDescriberMsg;

/**
 * Parses a raw message from the Train Describer feed into a more usable format.
 *
 * @param rawMessage The raw message object received from the feed.
 * @param referenceDate Optional reference time to use when parsing the message's timestamp.
 * @returns A parsed message object.
 * @throws Error if the input message does not appear to be in the expected format.
 */
export function parseTrainDescriberMessage(
    rawMessage: RawTD.TrainDescriberMsg,
    referenceDate: Date = new Date(),
): ParsedTD.TrainDescriberMsg {
    let timeNum = +rawMessage.time;
    const HOUR_IN_MS = 60 * 60 * 1000;
    if (timeNum > referenceDate.getTime() + 12 * HOUR_IN_MS) {
        // If the timestamp is more than 12 hours in the future, it's likely because of
        //  the cross-midnight bug (https://wiki.openraildata.com/index.php/TD#Cross-midnight_bug),
        //  so subtract 24 hours
        timeNum -= 24 * HOUR_IN_MS;
    }

    const parsed: any = {
        msgType: MESSAGE_TYPE_MAP[rawMessage.msg_type],
        time: new Date(timeNum),
        areaId: rawMessage.area_id,
    }
    
    if ('descr' in rawMessage) parsed.description = rawMessage.descr;
    if ('from' in rawMessage) parsed.from = rawMessage.from;
    if ('to' in rawMessage) parsed.to = rawMessage.to;
    if ('report_time' in rawMessage) {
        const hour = +rawMessage.report_time.slice(0, 2);
        const minute = +rawMessage.report_time.slice(2, 4);
        parsed.reportTime = new Date(parsed.time);
        parsed.reportTime.setHours(hour, minute, 0, 0);
        const diff = parsed.reportTime.getTime() - parsed.time.getTime();
        if (diff > 12 * HOUR_IN_MS) {
            parsed.reportTime.setTime(parsed.reportTime.getTime() - 24 * HOUR_IN_MS);
        } else if (diff < -12 * HOUR_IN_MS) {
            parsed.reportTime.setTime(parsed.reportTime.getTime() + 24 * HOUR_IN_MS);
        }
    }
    if ('address' in rawMessage) parsed.address = rawMessage.address;
    if ('data' in rawMessage) parsed.data = rawMessage.data;

    return parsed as ParsedTD.TrainDescriberMsg;
}
