import * as RawTsr from './raw';
import * as ParsedTsr from './parsed';
export * as RawTsr from './raw';
export * as ParsedTsr from './parsed';

/**
 * Parses a raw message from the TSR feed into a more usable format.
 *
 * @param rawMessage The raw message object received from the feed.
 * @returns A parsed message object.
 * @throws Error if the input message does not appear to be in the expected format.
 */
export function parseTsrMessage(rawMessage: RawTsr.TsrMessageWrapper): ParsedTsr.TsrBatchMsg {
    const rawOuterBatchMsg = rawMessage.TSRBatchMsgV1;
    const rawSender = rawOuterBatchMsg.Sender;
    const rawInnerBatchMsg = rawOuterBatchMsg.TSRBatchMsg;
    return {
        owner: rawOuterBatchMsg.owner,
        timestamp: new Date(+rawOuterBatchMsg.timestamp),
        originMsgId: rawOuterBatchMsg.originMsgId,
        classification: rawOuterBatchMsg.classification,
        systemEnvironmentCode: rawOuterBatchMsg.systemEnvironmentCode,
        sender: {
            organisation: rawSender.organisation,
            application: rawSender.application,
            applicationDomain: rawSender.applicationDomain,
            instance: rawSender.instance,
            component: rawSender.component,
            userId: rawSender.userID,
            sessionId: rawSender.sessionID,
            conversationId: rawSender.conversationID,
            messageId: rawSender.messageID,
        },
        topicId: rawOuterBatchMsg.Publication.TopicID,
        routeGroup: rawInnerBatchMsg.routeGroup,
        routeGroupCode: +rawInnerBatchMsg.routeGroupCode,
        publishSource: rawInnerBatchMsg.publishSource,
        routeGroupCoverage: rawInnerBatchMsg.routeGroupCoverage,
        batchPublishEvent: rawInnerBatchMsg.batchPublishEvent,
        publishDate: new Date(+rawInnerBatchMsg.publishDate),
        wonStartDate: new Date(+rawInnerBatchMsg.WONStartDate),
        wonEndDate: new Date(+rawInnerBatchMsg.WONEndDate),
        batch: rawInnerBatchMsg.tsr.map(rawTsr => {
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
    };
}