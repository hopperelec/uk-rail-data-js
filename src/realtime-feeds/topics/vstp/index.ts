import * as RawVSTP from './raw';
import * as ParsedVSTP from './parsed';
import {EnvelopedMessage} from "../../shared-message-envelope/parsed";
import {parseSharedMessageEnvelope} from "../../shared-message-envelope";
import {parseTrainActivities} from "../../../static/schedule/cif/parser";
export * as RawVSTP from './raw';
export * as ParsedVSTP from './parsed';

function parseHHMMSS(timeStr: string): Temporal.PlainTime {
    return new Temporal.PlainTime(
        +timeStr.slice(0, 2),
        +timeStr.slice(2, 4),
        +timeStr.slice(4, 6)
    );
}

/**
 * Parses a raw message from the VSTP feed into a more usable format.
 *
 * @param rawMessage The raw message object received from the feed.
 * @returns A parsed, enveloped message object.
 * @throws Error if the input message does not appear to be in the expected format.
 */
export function parseVstpMessage(rawMessage: RawVSTP.VstpMessageWrapper): EnvelopedMessage<ParsedVSTP.VeryShortTermPlan> {
    return parseSharedMessageEnvelope(
        rawMessage.VSTPCIFMsgV1,
        'schedule',
        rawVstp => ({
            scheduleId: rawVstp.schedule_id,
            transactionType: rawVstp.transaction_type,
            scheduleStartDate: rawVstp.schedule_start_date,
            scheduleEndDate: rawVstp.schedule_end_date,
            daysRun: rawVstp.schedule_days_runs,
            applicableTimetable: rawVstp.applicable_timetable === 'Y',
            bankHolidayRunning: rawVstp.CIF_bank_holiday_running,
            trainUID: rawVstp.CIF_train_uid,
            trainStatus: rawVstp.train_status,
            stpIndicator: rawVstp.CIF_stp_indicator,
            segments: rawVstp.schedule_segment.map(segment => ({
                signallingId: segment.signalling_id,
                uicCode: segment.uic_code === undefined ? undefined : +segment.uic_code,
                atocCode: segment.atoc_code,
                trainCategory: segment.CIF_train_category,
                trainIdentity: segment.CIF_headcode,
                trainServiceCode: segment.CIF_train_service_code,
                businessSector: segment.CIF_business_sector,
                powerType: segment.CIF_power_type,
                timingLoad: segment.CIF_timing_load,
                speed: segment.CIF_speed === undefined ? undefined : +segment.CIF_speed,
                operatingCharacteristics: new Set(segment.CIF_operating_characteristics?.split('') ?? []),
                trainClass: segment.CIF_train_class,
                sleeperAccommodation: segment.CIF_sleepers,
                reservationRequirements: segment.CIF_reservations,
                catering: new Set(segment.CIF_catering_code?.split('') ?? []),
                serviceBranding: new Set(segment.CIF_service_branding?.split('') ?? []),
                locations: segment.schedule_location.map(location => {
                    const base: ParsedVSTP.VstpScheduleLocationBase = {
                        platform: location.CIF_platform,
                        line: location.CIF_line,
                        path: location.CIF_path,
                        activities: parseTrainActivities(location.CIF_activity),
                        engineeringAllowance: location.CIF_engineering_allowance,
                        pathingAllowance: location.CIF_pathing_allowance,
                        performanceAllowance: location.CIF_performance_allowance,
                        location: location.location.tiploc.tiploc_id,
                    };
                    if ('scheduled_pass_time' in location) {
                        return {
                            ...base,
                            scheduledPassTime: parseHHMMSS(location.scheduled_pass_time)
                        } satisfies ParsedVSTP.VstpSchedulePassIntermediate;
                    }
                    if ('scheduled_arrival_time' in location && 'scheduled_departure_time' in location) {
                        return {
                            ...base,
                            scheduledArrivalTime: parseHHMMSS(location.scheduled_arrival_time),
                            scheduledDepartureTime: parseHHMMSS(location.scheduled_departure_time)
                        } satisfies ParsedVSTP.VstpScheduleNormalIntermediate;
                    }
                    if ('scheduled_arrival_time' in location) {
                        return {
                            ...base,
                            scheduledArrivalTime: parseHHMMSS(location.scheduled_arrival_time)
                        } satisfies ParsedVSTP.VstpScheduleTerminus;
                    }
                    return {
                        ...base,
                        scheduledDepartureTime: parseHHMMSS(location.scheduled_departure_time)
                    } satisfies ParsedVSTP.VstpScheduleOrigin;
                }) as [ParsedVSTP.VstpScheduleOrigin, ...ParsedVSTP.VstpScheduleIntermediate[], ParsedVSTP.VstpScheduleTerminus]
            }))
        } satisfies ParsedVSTP.VeryShortTermPlan)
    );
}
