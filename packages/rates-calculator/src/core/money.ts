/**
 * Round a monetary value to 2 decimals using standard half-up rounding
 * (3rd decimal 0-4 keeps the cent, 5-9 rounds up).
 */
export function roundMoney(value: number): number {
    // Add a tiny epsilon to counter binary floating-point representation errors
    // (e.g. 1.005 stored as 1.00499999...) so half-up behaves as expected.
    const sign = value < 0 ? -1 : 1;
    const scaled = Math.abs(value) * 100;
    return (sign * Math.round(scaled + 1e-9)) / 100;
}
