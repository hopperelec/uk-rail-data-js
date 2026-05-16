import { UnixEpochMsTimestamp } from "../../types";

/** The message envelope shared between Network Rail's topics for TSRs, VSTPs and RTPPMs. */
interface SharedMessageEnvelope {
    /**
     * @example "http://xml.hiav.networkrail.co.uk/schema/net/tsr/1 net_tsr_messaging_v1.xsd"
     * @example "http://xml.networkrail.co.uk/ns/2008/Train itm_vstp_cif_messaging_v1.xsd"
     */
    schemaLocation: string;
    /** @example "Network Rail" */
    owner: string;
    /** When the message was generated. */
    timestamp: UnixEpochMsTimestamp;
    /** @example "industry" */
    classification: string;
    /** @example "2015-02-02T09:18:23.718+00:00-9PPS" */
    originMsgId?: string;
    /** @example "Production" */
    systemEnvironmentCode?: string;

    Sender: {
        /** @example "Network Rail" */
        organisation: string;
        /**
         * @example "HUB"
         * @example "TOPS"
         */
        application: string;
        /** @example "net" */
        applicationDomain?: string;
        /** @example "VSTP" */
        component?: string;
        instance?: string;
        userID?: string;
        sessionID?: string;
        conversationID?: string;
        messageID?: string;
    };

    Publication: {
        /** @example "TSR/9" */
        TopicID: string;
    };
}

/** A message from Network Rail's topics for TSRs, VSTPs or RTPPMs, wrapped in the shared message envelope. */
export type EnvelopedMessage<
    TopicKey extends string,
    TopicData,
> = SharedMessageEnvelope & {
    [key in TopicKey]: TopicData;
};