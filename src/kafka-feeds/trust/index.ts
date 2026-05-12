import {Consumer} from "kafkajs";
import EventEmitter from "node:events";
import {TrustMessage} from "./types";
export * from "./types";

/**
 * Client for Network Rail's Train Movements feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/Train_Movements}
 *
 * @emits 'connected' when the client successfully connects to the Kafka broker.
 * @emits 'subscribed' when the client successfully subscribes to the topic, with an object containing the `fromBeginning` option.
 * @emits 'message' when a new message is received from the feed, with the parsed message object as an argument.
 * @emits 'error' when an error occurs during message processing, with the Error object as an argument.
 * @emits 'disconnected' when the client successfully disconnects from the Kafka broker.
 *
 * @example
 * import {Kafka} from "kafkajs";
 * import TrainMovementsClient from "uk-rail-data-js/kafka-feeds/train-movements";
 *
 * const kafka = new Kafka({
 *     clientId: 'my-train-movements-client',
 *     brokers: [process.env.KAFKA_HOST!],
 *     ssl: true,
 *     sasl: {
 *         mechanism: 'plain',
 *         username: process.env.KAFKA_USERNAME!,
 *         password: process.env.KAFKA_PASSWORD!,
 *     },
 * });
 * const consumer = kafka.consumer({
 *     groupId: process.env.KAFKA_GROUP!,
 * });
 *
 * const tmClient = new TrainMovementsClient(consumer)
 *     .on('message', msg => {
 *         console.log('Received message:', msg);
 *     })
 *     .on('error', err => {
 *         console.error('Error:', err);
 *     });
 * tmClient.start().catch(err => {
 *     console.error('Failed to start TrainMovementsClient:', err);
 * });
 */
export default class TrainMovementsClient extends EventEmitter {
    private consumer: Consumer;

    /**
     * Creates a new TrainMovementsClient instance.
     *
     * @param kafkaConsumer An instance of a KafkaJS Consumer configured to consume from the Train Describer feed's topic (TD_ALL_SIG_AREA).
     */
    constructor(kafkaConsumer: Consumer) {
        super();
        this.consumer = kafkaConsumer;
    }

    /**
     * Subscribes to the feed
     *
     * @param fromBeginning Whether to attempt to consume messages from since the last connection before starting to consume new messages. Defaults to false (only consume new messages). Note that this will have no effect if the consumer group has not connected recently.
     * @returns A promise that resolves once the consumer has successfully started and is processing messages.
     */
    public async start(fromBeginning = false): Promise<void> {
        await this.consumer.connect();
        super.emit('connected');

        await this.consumer.subscribe({
            topic: 'TRAIN_MVT_ALL_TOC',
            fromBeginning
        });
        super.emit('subscribed', { fromBeginning });

        await this.consumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value) return;

                let messages: TrustMessage[];
                try {
                    messages = JSON.parse(message.value.toString());
                } catch (err) {
                    super.emit('error', new Error(`Failed to parse message: ${err instanceof Error ? err.message : String(err)}`));
                    return;
                }

                for (const msg of messages) {
                    super.emit('message', msg);
                }
            },
        });
    }

    /**
     * Disconnects from the feed and stops processing messages.
     *
     * @returns A promise that resolves once the consumer has successfully disconnected.
     */
    public async stop(): Promise<void> {
        await this.consumer.disconnect();
        super.emit('disconnected');
    }
}
