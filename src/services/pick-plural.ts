// Port of the web widget's frontend/shared/pick-plural.ts + plural-category.ts.
// CLDR plural categories as single letters: O=one T=two F=few M=many X=other. zero folds into X.
type PluralCode = 'O' | 'T' | 'F' | 'M' | 'X';

const rulesByLocale: Record<string, Intl.PluralRules | null> = {};

function getPluralRules(locale: string | undefined | null): Intl.PluralRules | null {
    const key = locale || '';
    if (key in rulesByLocale) {
        return rulesByLocale[key];
    }
    let rules: Intl.PluralRules | null = null;
    // Older JS engines ship without Intl.PluralRules; English rules below cover that case.
    if (typeof Intl !== 'undefined' && typeof Intl.PluralRules === 'function') {
        try {
            rules = new Intl.PluralRules((key || 'en').replace(/_/g, '-'));
        } catch {
            // Unvalidated values like "en_US.UTF-8" (SSO user locale) are not valid tags.
            rules = new Intl.PluralRules('en');
        }
    }
    rulesByLocale[key] = rules;
    return rules;
}

function getPluralCode(count: number, locale: string | undefined | null): PluralCode {
    const rules = getPluralRules(locale);
    if (!rules) {
        return count === 1 ? 'O' : 'X';
    }
    switch (rules.select(count)) {
        case 'one':
            return 'O';
        case 'two':
            return 'T';
        case 'few':
            return 'F';
        case 'many':
            return 'M';
        default:
            return 'X';
    }
}

/**
 * Picks the plural form for a count. two/few/many are only defined by locales that need them (the KEY_T/KEY_F/KEY_M
 * translation keys), and a form a locale leaves out falls back to other.
 */
export function pickPlural<T>(count: number, locale: string | undefined | null, one: T | undefined, other: T, two?: T, few?: T, many?: T): T {
    const code = getPluralCode(count, locale);
    return (code === 'O' ? one : code === 'T' ? two : code === 'F' ? few : code === 'M' ? many : other) || other;
}
