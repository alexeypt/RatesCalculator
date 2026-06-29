# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-06-29

### Added
- Debt tokens: `BondInput.instrument` (`'bond' | 'token'`). Tokens are computed like regular
  bonds except the buyer earns income only from the purchase date, so the first coupon after
  settlement is prorated from that date (the part of the current period before the purchase
  belongs to the seller). All other metrics reuse the bond engine.
- Price from a target yield: `computePriceFromYtm(input, ytmPercent)` and `BondInput.priceMode`
  (`'price' | 'ytm'`) + `targetYtmPercent` — derive the purchase price from a target simple YTM
  (doc formula 9, the inverse of the simple-YTM formula).
- Coupon income tax (`couponTaxPercent`, applied to coupons only) and one-time purchase costs
  for the whole lot (`purchaseCosts` spread across `quantity`), both folded into the yields and
  net income (doc formula 2). `BondResult` gained quote-currency totals (`couponSumQuote`,
  `priceGainQuote`, `totalIncomeQuote`, `nominalQuote`, `priceQuote`) for the nominal / index
  dual display.

### Changed
- Coupon amounts now round to 4 decimals for indexed bonds and 2 for regular bonds; headline
  metrics remain at 2. `roundTo` gained the precision used here.
- `BondResult.totalIncome` is now net of coupon tax and purchase costs.

## [1.2.0] - 2026-06-26

### Added
- Bond API (`rates-calculator/bonds`): `calculateBond` for regular and currency-indexed
  coupon bonds, computing simple yield to maturity, effective yield (IRR / XIRR), current
  yield, Macaulay duration, totals, and a per-payment cash-flow schedule. Indexed bonds use
  the currency-equivalent method — coupons and nominal convert at the base index (ER₀) and the
  price at the current index (ER_current), with yields computed in the index currency.
- Coupon helpers: `generateCouponDates` (regular schedule from a first date + frequency) and
  `computeCouponAmounts` (per-period amounts from rate, nominal, and a start-anchored
  actual/actual day count, so stub first periods are correct). Coupon precision is 4 decimals
  for indexed bonds and 2 for regular; headline metrics round to 2.
- Core helpers (`rates-calculator`): `roundTo` (configurable decimals), `daysBetween`, and
  `yearFractionActualActual` (the `t365/365 + t366/366` day-count convention).

## [1.0.1] - 2026-06-19

### Fixed
- Effective-rate metrics are now computed as a money-weighted return (IRR) instead
  of a simple final/contributed growth factor. Deposits with contributions or
  withdrawals spread across the term are no longer diluted toward zero — the
  reported rate reflects the deposit's actual yield regardless of when money is
  added or removed. For a single lump sum the result is unchanged
  (`(finalBalance / principal)^(1/years) - 1`). Affects `effectiveAnnualRate`,
  `totalRate`, and `totalAnnualRate`.

## [1.0.0] - 2026-06-17

### Added
- Initial release: framework-agnostic deposit calculator with day-by-day accrual
  (actual/actual day count), capitalization anchored to the start date, fixed and
  variable (float) rates, recurring and one-time contributions and withdrawals,
  per-contribution tax, and period detail aggregation.
- Core helpers (`rates-calculator`): money rounding and date/term utilities.
- Deposit API (`rates-calculator/deposits`): `calculateDeposit`, `aggregateDetails`,
  capitalization helpers, validation, and types.
