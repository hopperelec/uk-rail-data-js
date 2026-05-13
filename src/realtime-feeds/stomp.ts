import { Client, StompHeaders } from "@stomp/stompjs";
import { NetworkRailRealtimeClient, NetworkRailRealtimeSubscription } from "./index";

/**
 * Client for Network Rail's Stomp feeds (e.g. from Network Rail Open Data) via @stomp/stompjs.
 *
 * @see {@link https://publicdatafeeds.networkrail.co.uk/}
 * @see {@link https://wiki.openraildata.com/index.php/Connecting_with_Stomp}
 * @see {@link https://www.npmjs.com/package/@stomp/stompjs}
 *
 * @example
 * import { Client as StompClient } from "@stomp/stompjs";
 * import NetworkRailStompClient from "uk-rail-data-js/realtime-feeds/stomp";
 *
 * const stompClient = new StompClient({
 *     brokerURL: 'ws://publicdatafeeds.networkrail.co.uk:61618',
 *     connectHeaders: {
 *         login: process.env.NROD_USERNAME!,
 *         passcode: process.env.NROD_PASSWORD!,
 *         'client-id': 'my-app'
 *     },
 *     onConnect: async () => {
 *         const networkRailClient = new NetworkRailStompClient(stompClient);
 *         await networkRailClient.subscribeToTrainDescriber(
 *             msg => console.log('Received Train Describer message:', msg),
 *             err => console.error('Error processing Train Describer message:', err),
 *             { 'activemq.subscriptionName': 'my-app' }
 *         );
 *     },
 * });
 * stompClient.activate();
 */
export default class NetworkRailStompClient extends NetworkRailRealtimeClient<StompHeaders> {
    private client: Client;

    /**
     * Creates a new NetworkRailStompClient instance.
     *
     * @param stompClient An instance of a STOMP.js client configured with your NROD credentials.
     * @see {@link https://www.npmjs.com/package/@stomp/stompjs}
     */
    constructor(stompClient: Client) {
        super();
        this.client = stompClient;
    }

    /**
     * Subscribes to a topic on the Stomp feed.
     * This should only be called once the STOMP client has connected successfully (e.g. in the `onConnect` callback).
     *
     * @param topic The topic to subscribe to.
     * @param onMessage Callback invoked for each message received on the topic.
     * @param onError Optional callback invoked if an error occurs while processing messages. Errors while subscribing or unsubscribing will be thrown as exceptions instead.
     * @param options Subscription headers specific to STOMP (e.g. `'activemq.subscriptionName'` for durable subscriptions).
     * @returns A promise that resolves to a NetworkRailRealtimeSubscription, which can be used to unsubscribe from the topic.
     */
    async subscribe(
        topic: string,
        onMessage: (message: unknown) => void,
        onError?: (error: unknown) => void,
        options: StompHeaders = {},
    ): Promise<NetworkRailRealtimeSubscription> {
        return this.client.subscribe(
            `/topic/${topic}`,
            message => {
                if (!message.body) return;

                let messages: unknown;
                try {
                    messages = JSON.parse(message.body);
                } catch (err) {
                    onError?.(new Error('Failed to parse STOMP message body', { cause: err }));
                    return;
                }

                if (!Array.isArray(messages)) {
                    onError?.(new Error('Expected STOMP message body to be an array, but got: ' + typeof messages));
                    return;
                }

                for (const message of messages) {
                    try {
                        onMessage(message);
                    } catch (err) {
                        onError?.(new Error('Error processing message', { cause: err }));
                    }
                }
            },
            options
        );
    }
}
