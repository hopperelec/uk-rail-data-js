import * as RawTrust from './raw';
import * as ParsedTrust from './parsed';
import {TrustTrainId} from "./parsed";
export * as RawTrust from './raw';
export * as ParsedTrust from './parsed';

const MESSAGE_TYPE_MAP = {
    '0001': 'CALL',
    '0002': 'CANCELLATION',
    '0003': 'MOVEMENT',
    '0005': 'REINSTATEMENT',
    '0006': 'CHANGE OF ORIGIN',
    '0007': 'CHANGE OF IDENTITY',
    '0008': 'CHANGE OF LOCATION',
} as const satisfies Record<RawTrust.TrustMsgType, ParsedTrust.TrustMsgType>;

export function parseTrustMessage(rawMessage: RawTrust.TrustCallMsg): ParsedTrust.TrustCallMsg;
export function parseTrustMessage(rawMessage: RawTrust.TrustCancellationMsg): ParsedTrust.TrustCancellationMsg;
export function parseTrustMessage(rawMessage: RawTrust.TrustMovementMsg): ParsedTrust.TrustMovementMsg;
export function parseTrustMessage(rawMessage: RawTrust.TrustReinstatementMsg): ParsedTrust.TrustReinstatementMsg;
export function parseTrustMessage(rawMessage: RawTrust.TrustChangeOfOriginMsg): ParsedTrust.TrustChangeOfOriginMsg;
export function parseTrustMessage(rawMessage: RawTrust.TrustChangeOfIdentityMsg): ParsedTrust.TrustChangeOfIdentityMsg;
export function parseTrustMessage(rawMessage: RawTrust.TrustChangeOfLocationMsg): ParsedTrust.TrustChangeOfLocationMsg;
export function parseTrustMessage(rawMessage: RawTrust.TrustMessage): ParsedTrust.TrustMessage;

/**
 * Parses a raw message from the TRUST feed into a more usable format.
 *
 * Note that this uses the `Temporal` API so, on Node versions prior to 26, a polyfill will be needed.
 *
 * @param rawMessage The raw message object received from the feed.
 * @returns A parsed message object.
 * @throws Error if the input message does not appear to be in the expected format.
 */
export function parseTrustMessage(rawMessage: RawTrust.TrustMessage): ParsedTrust.TrustMessage {
    const parsedHeader: ParsedTrust.TrustMsgHeader = {
        msgType: MESSAGE_TYPE_MAP[rawMessage.header.msg_type],
        msgQueueTimestamp: new Date(+rawMessage.header.msg_queue_timestamp),
        sourceDevId: rawMessage.header.source_dev_id,
        userId: rawMessage.header.user_id,
        originalDataSource: rawMessage.header.original_data_source,
    };
    const parsedBaseBody: ParsedTrust.TrustMsgBodyBase = {
        trainId: new TrustTrainId(rawMessage.body.train_id),
        currentTrainId: rawMessage.body.current_train_id ? new TrustTrainId(rawMessage.body.current_train_id) : undefined,
        trainFileAddress: rawMessage.body.train_file_address,
        trainServiceCode: rawMessage.body.train_service_code,
    };
    let parsedBody: Omit<ParsedTrust.TrustMessage['body'], keyof ParsedTrust.TrustMsgBodyBase>;

    // Unfortunately, TypeScript doesn't seem to be able to narrow the type of `rawMessage`
    //  based on`rawMessage.header.msg_type` due to it being nested,
    //  so we will have to define `rawBody` with a type assertion in each case of the switch statement.
    switch (rawMessage.header.msg_type) {
        case '0001': {
            const rawBody = rawMessage.body as RawTrust.TrustCallBody;
            parsedBody = {
                tocId: rawBody.toc_id,
                scheduleSource: rawBody.schedule_source,
                d1266RecordNumber: rawBody.d1266_record_number,
                scheduleStartDate: Temporal.PlainDate.from(rawBody.schedule_start_date),
                scheduleEndDate: Temporal.PlainDate.from(rawBody.schedule_end_date),
                scheduleWttId: rawBody.schedule_wtt_id,
                scheduleType: rawBody.schedule_type,
                trainUid: rawBody.train_uid,
                isManualCall: rawBody.train_call_type === 'MANUAL',
                creationTimestamp: new Date(+rawBody.creation_timestamp),
                originDepartureTimestamp: new Date(+rawBody.origin_dep_timestamp),
                currentOriginTimestamp: Temporal.PlainDate.from(rawBody.tp_origin_timestamp),
                scheduledOrigin: rawBody.sched_origin_stanox,
                currentOrigin: rawBody.tp_origin_stanox,
            };
            break;
        }

        case '0002': {
            const rawBody = rawMessage.body as RawTrust.TrustCancellationBody;
            parsedBody = {
                tocId: rawBody.toc_id,
                divisionCode: rawBody.division_code,
                cancellationType: rawBody.canx_type,
                cancellationReason: rawBody.canx_reason_code,
                cancellationTimestamp: new Date(+rawBody.canx_timestamp),
                originalLocation: rawBody.orig_loc_stanox,
                originalLocationTimestamp: rawBody.orig_loc_timestamp ? new Date(+rawBody.orig_loc_timestamp) : undefined,
                location: rawBody.loc_stanox,
                departureTimestamp: new Date(+rawBody.dep_timestamp),
            };
            break;
        }

        case '0003': {
            const rawBody = rawMessage.body as RawTrust.TrustMovementBody;
            parsedBody = {
                tocId: rawBody.toc_id,
                divisionCode: rawBody.division_code,
                eventSource: rawBody.event_source,
                eventType: rawBody.event_type,
                plannedEventType: rawBody.planned_event_type,
                location: rawBody.loc_stanox,
                reportingLocation: rawBody.reporting_stanox,
                originalLocation: rawBody.original_loc_stanox,
                direction: rawBody.direction_ind,
                route: rawBody.route,
                line: rawBody.line_ind,
                platform: rawBody.platform,
                actualTimestamp: new Date(+rawBody.actual_timestamp),
                plannedTimestamp: rawBody.planned_timestamp ? new Date(+rawBody.planned_timestamp) : undefined,
                gbttTimestamp: rawBody.gbtt_timestamp ? new Date(+rawBody.gbtt_timestamp) : undefined,
                originalLocationTimestamp: rawBody.original_loc_timestamp ? new Date(+rawBody.original_loc_timestamp) : undefined,
                nextReportLocation: rawBody.next_report_stanox,
                minutesUntilNextReport: rawBody.next_report_run_time ? +rawBody.next_report_run_time : undefined,
                timetableVariation: +rawBody.timetable_variation,
                variationStatus: rawBody.variation_status,
                isAutomaticReportExpected: rawBody.auto_expected !== undefined ? rawBody.auto_expected === 'true' : undefined,
                isCorrection: rawBody.correction_ind === 'true',
                isDelayMonitoringPoint: rawBody.delay_monitoring_point === 'true',
                isTrainTerminated: rawBody.train_terminated === 'true',
            };
            break;
        }

        case '0005': {
            const rawBody = rawMessage.body as RawTrust.TrustReinstatementBody;
            parsedBody = {
                tocId: rawBody.toc_id,
                divisionCode: rawBody.division_code,
                originalLocationTimestamp: rawBody.original_loc_timestamp ? new Date(+rawBody.original_loc_timestamp) : undefined,
                originalLocation: rawBody.original_loc_stanox,
                location: rawBody.loc_stanox,
                reinstatementTimestamp: new Date(+rawBody.reinstatement_timestamp),
                departureTimestamp: new Date(+rawBody.dep_timestamp),
            };
            break;
        }

        case '0006': {
            const rawBody = rawMessage.body as RawTrust.TrustChangeOfOriginBody;
            parsedBody = {
                tocId: rawBody.toc_id,
                divisionCode: rawBody.division_code,
                originalLocation: rawBody.original_loc_stanox,
                originalLocationTimestamp: rawBody.original_loc_timestamp ? new Date(+rawBody.original_loc_timestamp) : undefined,
                newOrigin: rawBody.loc_stanox,
                eventTimestamp: new Date(+rawBody.coo_timestamp),
                departureTimestamp: new Date(+rawBody.dep_timestamp),
                reasonCode: rawBody.reason_code,
            };
            break;
        }

        case '0007': {
            const rawBody = rawMessage.body as RawTrust.TrustChangeOfIdentityBody;
            parsedBody = {
                revisedTrainId: new TrustTrainId(rawBody.revised_train_id),
                eventTimestamp: new Date(+rawBody.event_timestamp),
            };
            break;
        }

        case '0008': {
            const rawBody = rawMessage.body as RawTrust.TrustChangeOfLocationBody;
            parsedBody = {
                newLocation: rawBody.loc_stanox,
                originalLocation: rawBody.original_loc_stanox,
                eventTimestamp: new Date(+rawBody.event_timestamp),
                departureTimestamp: new Date(+rawBody.dep_timestamp),
                originalLocationTimestamp: new Date(+rawBody.original_loc_timestamp),
            };
            break;
        }

        default:
            // @ts-expect-error
            throw new Error(`Unexpected message type: ${rawMessage.header.msg_type}`);
    }

    // Clean up `undefined` values
    for (const obj of [parsedHeader, parsedBaseBody, parsedBody]) {
        for (const [key, value] of Object.entries(obj)) {
            if (value === undefined) {
                delete obj[key as keyof typeof obj];
            }
        }
    }

    return {
        header: parsedHeader,
        body: {
            ...parsedBaseBody,
            ...parsedBody,
        }
    } as ParsedTrust.TrustMessage;
}