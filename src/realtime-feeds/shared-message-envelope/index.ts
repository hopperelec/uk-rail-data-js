import * as RawSME from './raw';
import * as ParsedSME from './parsed';
export * as RawSME from './raw';
export * as ParsedSME from './parsed';

/**
 * Parses a message enclosed in the shared message envelope used by Network Rail's topics for TSRs, VSTPs and RTPPMs.
 *
 * @param rawMessage The raw message object received from the feed.
 * @param topicKey The key under which the topic-specific data can be found in the raw message.
 * @param topicDataParser A function to parse the topic-specific data.
 * @returns A parsed shared message envelope.
 * @throws Error if the input message does not appear to be in the expected format.
 */
export function parseSharedMessageEnvelope<
    TopicKey extends string,
    RawTopicData,
    ParsedTopicData,
>(
    rawMessage: RawSME.EnvelopedMessage<TopicKey, RawTopicData>,
    topicKey: TopicKey,
    topicDataParser: (rawTopicData: RawTopicData) => ParsedTopicData,
): ParsedSME.EnvelopedMessage<ParsedTopicData> {
    const rawSender = rawMessage.Sender;
    const result: ParsedSME.EnvelopedMessage<ParsedTopicData> = {
        schemaLocation: rawMessage.schemaLocation,
        owner: rawMessage.owner,
        timestamp: new Date(+rawMessage.timestamp),
        originMsgId: rawMessage.originMsgId,
        classification: rawMessage.classification,
        sender: {
            organisation: rawSender.organisation,
            application: rawSender.application,
            applicationDomain: rawSender.applicationDomain,
            component: rawSender.component,
            instance: rawSender.instance,
            userId: rawSender.userID,
            sessionId: rawSender.sessionID,
            conversationId: rawSender.conversationID,
            messageId: rawSender.messageID,
        },
        topicId: rawMessage.Publication.TopicID,
        topicData: topicDataParser(rawMessage[topicKey]),
    };
    if (rawMessage.systemEnvironmentCode) result.systemEnvironmentCode = rawMessage.systemEnvironmentCode;

    // Remove `undefined` values from the `sender`
    for (const [key, value] of Object.entries(result.sender)) {
        if (value === undefined) delete result.sender[key as keyof typeof result.sender];
    }

    return result;
}