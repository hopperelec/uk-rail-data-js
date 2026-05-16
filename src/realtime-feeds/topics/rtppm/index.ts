import * as RawRTPPM from './raw';
import * as ParsedRTPPM from './parsed';
import {parseSharedMessageEnvelope} from "../../shared-message-envelope";
import {EnvelopedMessage} from "../../shared-message-envelope/parsed";
export * as RawRTPPM from './raw';
export * as ParsedRTPPM from './parsed';

function parsePPM(ppm: RawRTPPM.PublicPerformanceMeasure): ParsedRTPPM.PublicPerformanceMeasure {
    return {
        performancePercentage: +ppm.text,
        rag: ppm.rag,
        trend: ppm.trendInd,
        displayFlag: ppm.displayFlag,
        ragDisplayFlag: ppm.ragDisplayFlag,
    };
}

function parseRecordWithPPM(record: RawRTPPM.RecordWithPPM): ParsedRTPPM.RecordWithPPM {
    return {
        total: +record.Total,
        ppm: parsePPM(record.PPM),
        rollingPPM: parsePPM(record.RollingPPM),
    };
}

function parseDetailedPPM(record: RawRTPPM.DetailedPerformanceRecord): ParsedRTPPM.DetailedPerformanceRecord;
function parseDetailedPPM(record: Omit<RawRTPPM.DetailedPerformanceRecord, 'CancelVeryLate'>): Omit<ParsedRTPPM.DetailedPerformanceRecord, 'cancelledOrVeryLate'>;
function parseDetailedPPM(record: Omit<RawRTPPM.DetailedPerformanceRecord, 'CancelVeryLate'> & Partial<Pick<RawRTPPM.DetailedPerformanceRecord, 'CancelVeryLate'>>) {
    return {
        ...parseRecordWithPPM(record),
        onTime: +record.OnTime,
        late: +record.Late,
        cancelledOrVeryLate: record.CancelVeryLate === undefined ? undefined : +record.CancelVeryLate,
    };
}

function parseToleranceTotal(tol: RawRTPPM.OperatorToleranceTotal): ParsedRTPPM.OperatorToleranceTotal {
    return {
        timeband: +tol.timeband,
        total: +tol.Total,
        onTime: +tol.OnTime,
        late: +tol.Late,
        cancelledOrVeryLate: +tol.CancelVeryLate,
    };
}

function xmlArrayToArray<T>(maybeArray?: T | T[]): T[] {
    if (!maybeArray) return [];
    return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
}

function parseOperator(operator: RawRTPPM.Operator): ParsedRTPPM.Operator {
    return {
        ...parseRecordWithPPM(operator),
        code: operator.code,
        name: operator.name,
        keySymbol: operator.keySymbol,
    }
}

function parseOperators(maybeOperators?: RawRTPPM.Operator | RawRTPPM.Operator[]): ParsedRTPPM.Operator[] {
    return xmlArrayToArray(maybeOperators).map(parseOperator);
}

function parseWebPage(webPage: RawRTPPM.WebPage): ParsedRTPPM.WebPage {
    return {
        webDisplayPeriod: webPage.WebDisplayPeriod === undefined ? undefined : +webPage.WebDisplayPeriod,
        webFixedMsg1: webPage.WebFixedMsg1,
        webFixedMsg2: webPage.WebFixedMsg2,
    };
}

/**
 * Parses a raw message from the RTPPM feed into a more usable format.
 *
 * @param rawMessage The raw message object received from the feed.
 * @returns A parsed, enveloped message object.
 * @throws Error if the input message does not appear to be in the expected format.
 */
export function parseRtppmMessage(rawMessage: RawRTPPM.RtppmMessageWrapper): EnvelopedMessage<ParsedRTPPM.RtppmData> {
    return parseSharedMessageEnvelope(
        rawMessage.RTPPMDataMsgV1,
        'RTPPMData',
        rawDataMsg => ({
            snapshotDate: new Date(+rawDataMsg.snapshotTStamp),
            webPpmUrl: rawDataMsg.WebPPMLink,
            systemMessage: rawDataMsg.SystemMsg,
            ppt: parsePPM(rawDataMsg.PPT),
            ragThresholds: xmlArrayToArray(rawDataMsg.RAGThresholds).map(rag => ({
                type: rag.type,
                good: +rag.good,
                medium: +rag.medium,
            })),
            nationalPage: {
                ...parseWebPage(rawDataMsg.NationalPage),
                operators: parseOperators(rawDataMsg.NationalPage.Operator),
                nationalPPM: parseDetailedPPM(rawDataMsg.NationalPage.NationalPPM),
                sectors: xmlArrayToArray(rawDataMsg.NationalPage.Sector).map(sector => ({
                    ppm: parseDetailedPPM(sector.SectorPPM),
                    code: sector.sectorCode,
                    description: sector.sectorDesc,
                })),
                webMsgOfMoment: rawDataMsg.NationalPage.WebMsgOfMoment,
                staleFlag: rawDataMsg.NationalPage.StaleFlag,
            },
            oocPage: {
                ...parseWebPage(rawDataMsg.OOCPage),
                operators: parseOperators(rawDataMsg.OOCPage.Operator),
            },
            focPage: rawDataMsg.FOCPage ? {
                ...parseWebPage(rawDataMsg.FOCPage),
                operators: parseOperators(rawDataMsg.FOCPage.Operator),
                nationalPPM: parseDetailedPPM(rawDataMsg.FOCPage.NationalPPM),
            } : undefined,
            commonOperatorPage: parseWebPage(rawDataMsg.CommonOperatorPage),
            operatorPages: xmlArrayToArray(rawDataMsg.OperatorPage).map(opPage => ({
                detail: {
                    ...parseOperator(opPage.Operator),
                    onTime: +opPage.Operator.OnTime,
                    late: +opPage.Operator.Late,
                    cancelledOrVeryLate: +opPage.Operator.CancelVeryLate,
                },
                toleranceTotals: xmlArrayToArray(opPage.OprToleranceTotal).map(parseToleranceTotal),
                serviceGroups: xmlArrayToArray(opPage.OprServiceGrp).map(sg => ({
                    ...parseToleranceTotal(sg),
                    ...parseDetailedPPM(sg),
                    name: sg.name,
                    sectorCode: sg.sectorCode,
                } satisfies ParsedRTPPM.OperatorServiceGroup)),
            })),
        } satisfies ParsedRTPPM.RtppmData),
    );
}
