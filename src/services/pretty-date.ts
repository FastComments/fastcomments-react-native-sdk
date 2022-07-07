export function getPrettyDate(translations: Record<string, string>, date: number) {
    const diff = ((Date.now() - date) / 1000),
        day_diff = Math.floor(diff / 86400);

    if (isNaN(day_diff) || day_diff < 0) return ''; // don't show 'undefined', so return a string.

    return day_diff === 0 && (
        diff < 60 && translations.JUST_NOW ||
        diff < 120 && translations.ONE_MINUTE_AGO ||
        diff < 3600 && Math.floor(diff / 60) + translations.MINUTES_AGO ||
        diff < 7200 && translations.ONE_HOUR_AGO ||
        diff < 86400 && Math.floor(diff / 3600) + translations.HOURS_AGO) ||
        day_diff === 1 && translations.YESTERDAY ||
        day_diff < 7 && day_diff + translations.DAYS_AGO ||
        Math.floor(day_diff) === 7 && translations.WEEK_AGO ||
        day_diff < 31 && Math.ceil(day_diff / 7) + translations.WEEKS_AGO ||
        day_diff < 365 && Math.ceil(day_diff / 30) + translations.MONTHS_AGO ||
        Math.ceil(day_diff / 365) + translations.YEARS_AGO;
}
