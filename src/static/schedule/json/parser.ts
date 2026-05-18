import readline from "readline";
import {Readable} from "node:stream";
import {JsonScheduleRecord} from "./raw";
import {createReadStream} from "fs";
import {fetchSchedule, ScheduleNrodCredentials, ScheduleRequest} from "../index";

/**
 * Parses a JSON SCHEDULE file from a stream, streaming the file contents in and streaming parsed records out.
 *
 * Note that this uses the `Temporal` API so, on Node versions prior to 26, a polyfill will be needed.
 *
 * @param fileStream A readable stream for the JSONL (one record per line) file
 * @returns An AsyncIterable of JsonScheduleRecord objects.
 */
export async function* jsonScheduleStream(fileStream: AsyncIterable<Uint8Array>): AsyncIterable<JsonScheduleRecord> {
    for await (const line of readline.createInterface({input: Readable.from(fileStream)})) {
        if (line.trim() === "") continue; // Skip empty lines
        const rawRecord: JsonScheduleRecord = JSON.parse(line);
        // TODO: Parsing
        yield rawRecord;
    }
}

/**
 * Creates a JSON SCHEDULE stream from a file path.
 *
 * Note that this uses the `Temporal` API so, on Node versions prior to 26, a polyfill will be needed.
 *
 * @param path The path to the CIF file.
 * @returns An AsyncIterable of CifStreamRecord objects.
 */
export function jsonScheduleStreamFromPath(path: string): AsyncIterable<JsonScheduleRecord> {
    return jsonScheduleStream(createReadStream(path));
}

/**
 * Fetches a JSON SCHEDULE file from the Network Rail Open Data API and creates a stream of its records.
 *
 * Note that this uses the `Temporal` API so, on Node versions prior to 26, a polyfill will be needed.
 *
 * @param credentials The credentials to use for the request.
 * @param request Details of the type/scope of SCHEDULE to request.
 * @param fetch An optional fetch function to use for making the HTTP request. Defaults to the global fetch.
 * @returns An AsyncIterable of CifStreamRecord objects.
 * @throws Error if the HTTP request fails or the response body is not a valid CIF file.
 */
export async function jsonScheduleStreamFromNROD(
    credentials: ScheduleNrodCredentials,
    request: Omit<ScheduleRequest, 'format'>,
    fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<AsyncIterable<JsonScheduleRecord>> {
    const response = await fetchSchedule(
        credentials,
        // type assertion needed since `format` is technically only valid when `scope` is 'all'
        { ...request, format: "json" } as ScheduleRequest,
        fetch
    );
    if (!response.ok) throw new Error(`Failed to fetch JSON SCHEDULE file: ${response.status} ${response.statusText}`);
    const fileStream = response.body;
    if (!fileStream) throw new Error("Response does not contain a body stream.");
    return jsonScheduleStream(fileStream.pipeThrough(new DecompressionStream('gzip')));
}
