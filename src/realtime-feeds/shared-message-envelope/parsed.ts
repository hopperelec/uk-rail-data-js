/** A message from Network Rail's topics for TSRs, VSTPs or RTPPMs, wrapped in the shared message envelope. */
export interface EnvelopedMessage<TopicData = unknown> {
    /**
     * @example "http://xml.hiav.networkrail.co.uk/schema/net/tsr/1 net_tsr_messaging_v1.xsd"
     * @example "http://xml.networkrail.co.uk/ns/2008/Train itm_vstp_cif_messaging_v1.xsd"
     */
    schemaLocation: string;
    /** @example "Network Rail" */
    owner: string;
    /** When the message was generated. */
    timestamp: Date;
    /** @example "industry" */
    classification: string;
    /** @example "2015-02-02T09:18:23.718+00:00-9PPS" */
    originMsgId?: string;
    /** @example "Production" */
    systemEnvironmentCode?: string;

    sender: {
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
        userId?: string;
        sessionId?: string;
        conversationId?: string;
        messageId?: string;
    };

    /** @example "TSR/9" */
    topicId: string;

    /** Data specific to the topic. */
    topicData: TopicData;
}
