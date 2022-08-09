function format(value: number, translation: string) {
    return translation.replace('[v]', value as unknown as string); // compile time cast faster than runtime conversion to string
}

export function getPrettyDate(translations: Record<string, string>, date: number) {
    const diff = ((Date.now() - date) / 1000),
        day_diff = Math.floor(diff / 86400);

    if (isNaN(day_diff) || day_diff < 0) return translations.JUST_NOW;

    return day_diff === 0 && (
        diff < 60 && translations.JUST_NOW ||
        diff < 120 && translations.ONE_MINUTE_AGO ||
        diff < 3600 && format(Math.floor(diff / 60), translations.MINUTES_AGO) ||
        diff < 7200 && translations.ONE_HOUR_AGO ||
        diff < 86400 && format(Math.floor(diff / 3600), translations.HOURS_AGO)) ||
        day_diff === 1 && translations.YESTERDAY ||
        day_diff < 7 && format(day_diff, translations.DAYS_AGO) ||
        Math.floor(day_diff) === 7 && translations.WEEK_AGO ||
        day_diff < 31 && format(Math.ceil(day_diff / 7), translations.WEEKS_AGO) ||
        day_diff < 365 && format(Math.ceil(day_diff / 30), translations.MONTHS_AGO) ||
        format(Math.ceil(day_diff / 365), translations.YEARS_AGO);
}
