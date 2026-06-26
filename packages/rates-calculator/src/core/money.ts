/**
 * Round a value to the given number of decimals using standard half-up rounding
 * (the next decimal 0-4 rounds down, 5-9 rounds up).
 */
export function roundTo(value: number, decimals: number): number {
    // Add a tiny epsilon to counter binary floating-point representation errors
    // (e.g. 1.005 stored as 1.00499999...) so half-up behaves as expected.
    const factor = Math.pow(10, decimals);
    const sign = value < 0 ? -1 : 1;
    const scaled = Math.abs(value) * factor;
    return (sign * Math.round(scaled + 1e-9)) / factor;
}

/**
 * Round a monetary value to 2 decimals using standard half-up rounding
 * (3rd decimal 0-4 keeps the cent, 5-9 rounds up).
 */
export function roundMoney(value: number): number {
    return roundTo(value, 2);
}
