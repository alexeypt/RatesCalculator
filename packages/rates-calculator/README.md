# rates-calculator

Framework-agnostic financial-rate calculations. Currently provides a
day-by-day deposit calculator (capitalization, fixed/variable rates,
contributions, withdrawals, per-contribution tax, and detail aggregation).
Bonds and other instruments are planned.

The library is pure TypeScript with a single runtime dependency
([date-fns](https://date-fns.org/)) and ships as ESM.

## Installation

```bash
npm install rates-calculator
```

## Usage

```ts
import { calculateDeposit, aggregateDetails } from 'rates-calculator/deposits';
import { roundMoney, parseISODate } from 'rates-calculator';

const result = calculateDeposit({
    amount: 10000,
    startDate: '2024-01-01',
    term: { value: 1, unit: 'years' },
    rateType: 'fixed',
    fixedRate: 8,
    floatSchedule: [],
    capitalization: true,
    capFrequency: 'monthly',
    incomeTaxPercent: 0,
    additionType: 'none',
    recurringAddition: { amount: 0, frequency: 'monthly' },
    oneTimeAdditions: [],
    withdrawalType: 'none',
    recurringWithdrawal: { amount: 0, frequency: 'monthly' },
    oneTimeWithdrawals: []
});

console.log(result.finalBalance, result.totalIncome);

// Collapse the daily detail rows into a coarser view.
const monthly = aggregateDetails(result.dailyDetails, 'monthly');
```

## Entry points

- `rates-calculator` — shared core: money rounding, date/term helpers, types.
- `rates-calculator/deposits` — deposit input/result types, `calculateDeposit`,
  `aggregateDetails`, capitalization helpers, and validation.

## Scripts

```bash
npm run build      # type-check and emit dist (JS + d.ts)
npm run dev        # build in watch mode
npm test           # run the unit tests once
npm run test:watch # run the unit tests in watch mode
```

## License

MIT
