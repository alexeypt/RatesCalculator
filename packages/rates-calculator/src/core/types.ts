export type TermUnit = 'days' | 'months' | 'years';

/** A length of time expressed as a value and a unit. */
export interface Term {
    value: number;
    unit: TermUnit;
}
