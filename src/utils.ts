/**
 * Creates a Date object in the "Europe/London" time zone.
 *
 * @param year - The year of the date.
 * @param month - The month of the date (1-12).
 * @param day - The day of the date (1-31).
 * @param hour - The hour of the date (0-23), default is 0.
 * @param minute - The minute of the date (0-59), default is 0.
 * @param second - The second of the date (0-59), default is 0.
 * @param millisecond - The millisecond of the date (0-999), default is 0.
 * @returns A Date object representing the specified date and time in the "Europe/London" time zone.
 * @throws RangeError If the provided components are out of valid ranges.
 */
export function newDateUk(
    year: number,
    month: number,
    day: number,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0
): Date {
    return new Date(
        Temporal.ZonedDateTime.from({
            timeZone: "Europe/London",
            year,
            month,
            day,
            hour,
            minute,
            second,
            millisecond
        }).toInstant().epochMilliseconds
    );
}
