# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
