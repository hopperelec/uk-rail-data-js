import {parseTrainDescriberMessage, RawTD, ParsedTD} from "./topics/train-describer";
import {parseTrustMessage, RawTrust, ParsedTrust} from "./topics/trust";
import {parseTsrMessage, RawTsr, ParsedTsr} from "./topics/tsr";

/** A subscription to a topic on a Network Rail realtime feed. */
export interface NetworkRailRealtimeSubscription {
    /** Unsubscribe from the topic. */
    unsubscribe: () => void | Promise<void>;
}

/** Abstract base class for Network Rail realtime feed clients. */
export abstract class NetworkRailRealtimeClient<SubscriptionOptions> {
    /**
     * Subscribes to a topic on the realtime feed.
     *
     * @param topic The topic to subscribe to.
     * @param onMessage Callback invoked for each message received on the topic.
     * @param onError Optional callback invoked if an error occurs while processing messages. Errors while subscribing or unsubscribing will be thrown as exceptions instead.
     * @param options Subscription options specific to the feed implementation.
     * @returns A promise that resolves to a NetworkRailRealtimeSubscription, which can be used to unsubscribe from the topic.
     */
    abstract subscribe(
        topic: string,
        onMessage: (message: unknown) => void,
        onError?: (error: unknown) => void,
        options?: SubscriptionOptions,
    ): Promise<NetworkRailRealtimeSubscription>;

    /**
     * Subscribes to the Train Describer feed, with middleware to parse messages into a more usable format.
     *
     * @param onMessage Callback invoked for each parsed Train Describer message received.
     * @param onError Optional callback invoked if an error occurs while processing messages. Errors while subscribing or unsubscribing will be thrown as exceptions instead.
     * @param options Subscription options specific to the feed implementation.
     * @see {@link https://wiki.openraildata.com/index.php/TD}
     */
    subscribeToTrainDescriber(
        onMessage: (message: ParsedTD.TrainDescriberMsg) => void,
        onError?: (error: unknown) => void,
        options?: SubscriptionOptions,
    ): Promise<NetworkRailRealtimeSubscription> {
        return this.subscribe('TD_ALL_SIG_AREA', rawMessage => {
            // Ignore the top-level keys, which correspond directly to `rawInnerMessage.msg_type`
            for (const rawInnerMessage of Object.values(rawMessage as Record<string, RawTD.TrainDescriberMsg>)) {
                try {
                    onMessage(parseTrainDescriberMessage(rawInnerMessage));
                } catch (err) {
                    onError?.(err);
                }
            }
        }, onError, options);
    }

    /**
     * Subscribes to the TRUST feed, with middleware to parse messages into a more usable format.
     *
     * @param onMessage Callback invoked for each parsed TRUST message received.
     * @param onError Optional callback invoked if an error occurs while processing messages. Errors while subscribing or unsubscribing will be thrown as exceptions instead.
     * @param options Subscription options specific to the feed implementation.
     * @see {@link https://wiki.openraildata.com/index.php/Train_Movements}
     */
    subscribeToTrust(
        onMessage: (message: ParsedTrust.TrustMessage) => void,
        onError?: (error: unknown) => void,
        options?: SubscriptionOptions,
    ): Promise<NetworkRailRealtimeSubscription> {
        return this.subscribe('TRAIN_MVT_ALL_TOC', message => {
            try {
                onMessage(parseTrustMessage(message as RawTrust.TrustMessage));
            } catch (err) {
                onError?.(err);
            }
        }, onError, options);
    }

    // TODO: This is mostly untested right now because I started writing the code at 0800 on a Friday...
    /**
     * Subscribes to the Temporary Speed Restriction (TSR) feed, with middleware to parse messages into a more usable format.
     *
     * Messages to this feed are only meant to be published at 0600 on Fridays, with one message for each route group.
     *
     * @param onMessage Callback invoked for each parsed TSR message received.
     * @param onError Optional callback invoked if an error occurs while processing messages. Errors while subscribing or unsubscribing will be thrown as exceptions instead.
     * @param options Subscription options specific to the feed implementation.
     * @see {@link https://wiki.openraildata.com/index.php/TSR}
     */
    subscribeToTSRs(
        onMessage: (message: ParsedTsr.TsrBatchMsg) => void,
        onError?: (error: unknown) => void,
        options?: SubscriptionOptions,
    ): Promise<NetworkRailRealtimeSubscription> {
        return this.subscribe('TSR_ALL_ROUTE', message => {
            try {
                onMessage(parseTsrMessage(message as RawTsr.TsrMessageWrapper));
            } catch (err) {
                onError?.(err);
            }
        }, onError, options);
    }
}