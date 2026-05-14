import {parseTrainDescriberMessage, RawTrainDescriberMsg, TrainDescriberMsg} from "./topics/train-describer";
import {parseTrustMessage, RawTrust, ParsedTrust} from "./topics/trust";

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
        onMessage: (message: TrainDescriberMsg) => void,
        onError?: (error: unknown) => void,
        options?: SubscriptionOptions,
    ): Promise<NetworkRailRealtimeSubscription> {
        return this.subscribe('TD_ALL_SIG_AREA', rawMessage => {
            // Ignore the top-level keys, which correspond directly to `rawInnerMessage.msg_type`
            for (const rawInnerMessage of Object.values(rawMessage as Record<string, RawTrainDescriberMsg>)) {
                try {
                    onMessage(parseTrainDescriberMessage(rawInnerMessage));
                } catch (err) {
                    onError?.(err);
                }
            }
        }, onError, options);
    }

    /**
     * Subscribes to the Trust feed, with middleware to parse messages into a more usable format.
     *
     * @param onMessage Callback invoked for each parsed Trust message received.
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
}