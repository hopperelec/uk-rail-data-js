import {Consumer, ConsumerSubscribeTopics, EachMessagePayload} from "kafkajs";
import {NetworkRailRealtimeClient, NetworkRailRealtimeSubscription} from "./index";

type NetworkRailKafkaSubscribeOptions = Omit<ConsumerSubscribeTopics, 'topics'>;

/**
 * Client for Network Rail's Kafka feeds (e.g. from Rail Data Marketplace) via KafkaJS.
 *
 * @see {@link https://raildata.org.uk/dataProducts?page=1&dataSourceType=Streaming&organizations=1033}
 * @see {@link https://kafka.js.org/}
 *
 * @example
 * import { Kafka } from "kafkajs";
 * import NetworkRailKafkaClient from "uk-rail-data-js/realtime-feeds/kafka";
 *
 * const kafka = new Kafka({
 *     clientId: 'my-app',
 *     brokers: [process.env.KAFKA_BROKER!],
 *     ssl: true,
 *     sasl: {
 *         mechanism: 'plain',
 *         username: process.env.KAFKA_USERNAME!,
 *         password: process.env.KAFKA_PASSWORD!,
 *     },
 * });
 * const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP! });
 *
 * const networkRailClient = new NetworkRailKafkaClient(consumer);
 * await networkRailClient.subscribeToTrainDescriber(
 *     msg => console.log('Received Train Describer message:', msg),
 *     err => console.error('Error processing Train Describer message:', err),
 *     { fromBeginning: true }
 * );
 *
 * await consumer.run({
 *    eachMessage: networkRailClient.eachMessage,
 * });
 */
export default class NetworkRailKafkaClient extends NetworkRailRealtimeClient<NetworkRailKafkaSubscribeOptions> {
    private consumer: Consumer;
    /** Map of topic to set of subscriptions for that topic. */
    private subscriptions: Record<string, Set<{
        onMessage: (message: unknown) => void;
        onError?: (error: unknown) => void;
    }>> = {};

    /**
     * Creates a new NetworkRailKafkaClient instance.
     *
     * @param kafkaConsumer An instance of a KafkaJS Consumer configured with your Network Rail credentials.
     * @see {@link https://kafka.js.org/}
     */
    constructor(kafkaConsumer: Consumer) {
        super();
        this.consumer = kafkaConsumer;
    }

    /**
     * Subscribes to a topic on the Kafka feed.
     *
     * @param topic The topic to subscribe to.
     * @param onMessage Callback invoked for each message received on the topic.
     * @param onError Optional callback invoked if an error occurs while processing messages. Errors while subscribing or unsubscribing will be thrown as exceptions instead.
     * @param options Subscription options specific to KafkaJS (currently, this is just `fromBeginning`).
     *
     * @returns
     * A promise that resolves to a NetworkRailRealtimeSubscription, which can be used to unsubscribe from the topic.
     * Note that unsubscribing will not stop the Kafka consumer from receiving messages for the topic,
     *  but will simply stop invoking the provided callbacks for new messages.
     * To fully stop receiving messages, you would need to call `consumer.stop()`.
     */
    async subscribe(
        topic: string,
        onMessage: (message: unknown) => void,
        onError?: (error: unknown) => void,
        options: NetworkRailKafkaSubscribeOptions = {},
    ): Promise<NetworkRailRealtimeSubscription> {
        if (!this.subscriptions[topic]) {
            this.subscriptions[topic] = new Set();
        }
        const subscription = {onMessage, onError};
        this.subscriptions[topic].add(subscription);

        if (this.subscriptions[topic].size === 1) {
            await this.consumer.subscribe({
                ...options,
                topics: [topic],
            });
        }

        return {
            unsubscribe: async () => {
                if (this.subscriptions[topic].delete(subscription) && this.subscriptions[topic].size === 0) {
                    delete this.subscriptions[topic];
                    // Note: KafkaJS does not support fully unsubscribing from topics;
                    //       this function just stops invoking the callbacks for new messages.
                }
            }
        };
    }

    /**
     * Dispatches incoming Kafka messages to any subscriptions for the message's topic.
     * This should be passed as the `eachMessage` handler (or used within it) when running the Kafka consumer.
     *
     * @param payload The payload of the incoming Kafka message, provided by KafkaJS.
     */
    eachMessage = async (payload: EachMessagePayload) => {
        if (!payload.message.value) return;

        const subscriptions = this.subscriptions[payload.topic];
        if (!subscriptions) return;

        let messages: unknown[];
        try {
            messages = JSON.parse(payload.message.value.toString());
        } catch (err) {
            for (const {onError} of subscriptions) {
                try {
                    onError?.(new Error('Failed to parse message value', {cause: err}));
                } catch {}
            }
            return;
        }

        if (!Array.isArray(messages)) {
            messages = [messages];
        }

        for (const message of messages) {
            for (const subscription of subscriptions) {
                try {
                    subscription.onMessage(message);
                } catch (err) {
                    try {
                        subscription.onError?.(new Error('Error processing message', {cause: err}));
                    } catch {}
                }
            }
        }
    }
}
