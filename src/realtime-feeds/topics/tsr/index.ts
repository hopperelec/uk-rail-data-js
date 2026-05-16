import * as RawTsr from './raw';
import * as ParsedTsr from './parsed';
import {parseSharedMessageEnvelope} from "../../shared-message-envelope";
import {EnvelopedMessage} from "../../shared-message-envelope/parsed";
export * as RawTsr from './raw';
export * as ParsedTsr from './parsed';

/**
 * Parses a raw message from the TSR feed into a more usable format.
 *
 * @param rawMessage The raw message object received from the feed.
 * @returns A parsed, enveloped message object.
 * @throws Error if the input message does not appear to be in the expected format.
 */
export function parseTsrMessage(rawMessage: RawTsr.TsrMessageWrapper): EnvelopedMessage<ParsedTsr.TsrBatchMsg> {
    return parseSharedMessageEnvelope(
        rawMessage.TSRBatchMsgV1,
        'TSRBatchMsg',
        rawBatchMsg => ({
            routeGroup: rawBatchMsg.routeGroup,
            routeGroupCode: +rawBatchMsg.routeGroupCode,
            publishSource: rawBatchMsg.publishSource,
            routeGroupCoverage: rawBatchMsg.routeGroupCoverage,
            batchPublishEvent: rawBatchMsg.batchPublishEvent,
            publishDate: new Date(+rawBatchMsg.publishDate),
            wonStartDate: new Date(+rawBatchMsg.WONStartDate),
            wonEndDate: new Date(+rawBatchMsg.WONEndDate),
            batch: rawBatchMsg.tsr.map(rawTsr => {
                const tsr: ParsedTsr.TemporarySpeedRestriction = {
                    id: rawTsr.TSRID,
                    ref: rawTsr.TSRReference,
                    creationDate: new Date(+rawTsr.creationDate),
                    publishDate: new Date(+rawTsr.publishDate),
                    validFromDate: new Date(+rawTsr.ValidFromDate),
                    validToDate: new Date(+rawTsr.ValidToDate),
                    publishEvent: rawTsr.publishEvent,
                    routeGroup: rawTsr.RouteGroupName,
                    routeCode: rawTsr.RouteCode,
                    routeOrder: rawTsr.RouteOrder,
                    fromLocation: rawTsr.FromLocation,
                    toLocation: rawTsr.ToLocation,
                    lineName: rawTsr.LineName,
                    direction: rawTsr.Direction,
                    subunitType: rawTsr.SubunitType,
                    mileageFrom: +rawTsr.MileageFrom,
                    subunitFrom: +rawTsr.SubunitFrom,
                    mileageTo: +rawTsr.MileageTo,
                    subunitTo: +rawTsr.SubunitTo,
                    movingMileage: rawTsr.MovingMileage === 'true',
                    passengerSpeed: +rawTsr.PassengerSpeed,
                    freightSpeed: +rawTsr.FreightSpeed,
                    reason: rawTsr.Reason,
                    requestor: rawTsr.Requestor,
                };
                if (rawTsr.WONValidFrom) tsr.wonValidFrom = rawTsr.WONValidFrom;
                if (rawTsr.WONValidTo) tsr.wonValidTo = rawTsr.WONValidTo;
                if (rawTsr.Comments) tsr.comments = rawTsr.Comments;
                return tsr;
            }),
        } satisfies ParsedTsr.TsrBatchMsg),
    );
}
