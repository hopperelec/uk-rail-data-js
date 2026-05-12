import {Consumer} from "kafkajs";
import EventEmitter from "node:events";
import {UnixEpochMsTimestamp} from "../../types";
export * from "./types";

/**
 * Converts a timestamp string from the Train Describer feed into a JavaScript Date object,
 *  accounting for the known cross-midnight bug.
 *
 * @see {@link https://wiki.openraildata.com/index.php/TD#Cross-midnight_bug}
 * @param timeStr A string containing a unix timestamp (milliseconds since the epoch).
 * @returns The corresponding Date object, with the cross-midnight bug accounted for if necessary.
 */
function timestampToDate(timeStr: UnixEpochMsTimestamp): Date {
    let timeNum = +timeStr;
    const HOUR_IN_MS = 60 * 60 * 1000;
    if (timeNum > Date.now() + 12 * HOUR_IN_MS) {
        // If the timestamp is more than 12 hours in the future,
        //  it's likely because of the cross-midnight bug, so subtract 24 hours
        timeNum -= 24 * HOUR_IN_MS;
    }
    return new Date(timeNum);
}

/**
 * Client for Network Rail's Train Describer feed.
 *
 * @see {@link https://wiki.openraildata.com/index.php/TD}
 *
 * @emits 'connected' when the client successfully connects to the Kafka broker.
 * @emits 'subscribed' when the client successfully subscribes to the topic, with an object containing the `fromBeginning` option.
 * @emits 'message' when a new message is received from the feed, with the parsed message object as an argument.
 * @emits 'error' when an error occurs during message processing, with the Error object as an argument.
 * @emits 'disconnected' when the client successfully disconnects from the Kafka broker.
 *
 * @example
 * import {Kafka} from "kafkajs";
 * import TrainDescriberClient, {TrainDescriberMsg} from "uk-rail-data-js/kafka-feeds/train-describer";
 *
 * const kafka = new Kafka({
 *     clientId: 'my-train-describer-client',
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
 * const tdClient = new TrainDescriberClient(consumer)
 *     .on('message', (msg: TrainDescriberMsg) => {
 *         if (msg.msg_type === 'CA') {
 *             console.log(`Describer ${msg.descr} in TD ${msg.area_id} moved from berth ${msg.from} to berth ${msg.to} at ${msg.time}`);
 *         }
 *     }).on('error', err => {
 *         console.error('Error:', err);
 *     });
 * tdClient.start().catch(err => {
 *     console.error('Failed to start TrainDescriberClient:', err);
 * });
 */
export default class TrainDescriberClient extends EventEmitter {
    private consumer: Consumer;

    /**
     * Creates a new TrainDescriberClient instance.
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
            topic: 'TD_ALL_SIG_AREA',
            fromBeginning
        });
        super.emit('subscribed', { fromBeginning });

        await this.consumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value) return;

                let messages: any;
                try {
                    messages = JSON.parse(message.value.toString());
                } catch (err) {
                    super.emit('error', new Error(`Failed to parse message: ${err instanceof Error ? err.message : String(err)}`));
                    return;
                }

                for (const msg of messages) {
                    for (const value of Object.values(msg) as any[]) {
                        if ('time' in value) {
                            value.time = timestampToDate(value.time);
                        }
                        super.emit('message', value);
                    }
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
