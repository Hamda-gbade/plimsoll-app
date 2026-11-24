import { CLASSIC_DECIMALS, parseUnits } from "@plimsoll/sdk";

/**
 * The coverage ledger refuses a reserve figure whose ratio to the stored
 * supply lies outside this window: 0.01% (1 bps) to 10,000% (1,000,000 bps).
 * Both ends are inclusive. The form warns before the wallet is asked to sign,
 * because the contract would reject the transaction.
 */
export const MIN_PLAUSIBLE_BPS = 1n;
export const MAX_PLAUSIBLE_BPS = 1_000_000n;

/** A ratio in basis points, formatted without floating point. */
export function bpsText(bps: bigint): string {
  const whole = bps / 100n;
  const hundredths = bps % 100n;
  return `${whole}.${hundredths.toString().padStart(2, "0")}%`;
}

/** What a typed reserve figure would read as against the latest supply. */
export interface AmountPreview {
  /** Smallest units, as typed. */
  units: bigint;
  /** `floor(units × 10,000 ÷ supply)`, the coverage ledger's own formula. */
  bps: bigint;
  /** The ratio as text, e.g. "102.00%". */
  percent: string;
  /** Explains why the contract would refuse the figure, or null when it would not. */
  warning: string | null;
}

/**
 * The result of reading the amount field. `preview` is null when the asset has
 * no usable supply snapshot, because there is no ratio to compute.
 */
export type AmountCheck =
  | { kind: "empty" }
  | { kind: "invalid"; message: string }
  | { kind: "valid"; units: bigint; preview: AmountPreview | null };

const DECIMAL_INPUT = /^\d+(\.\d+)?$/;

/**
 * Reads the amount field as the user types. Amounts are whole asset units with
 * up to 7 decimals, converted to `bigint` smallest units here so the preview
 * and the submitted transaction use exactly the same figure.
 */
export function checkAmount(
  value: string,
  supply: bigint | null | undefined,
  code = "this asset",
): AmountCheck {
  const clean = value.trim().replace(/[,\s_]/g, "");
  if (!clean) return { kind: "empty" };
  if (clean.startsWith("-")) {
    return { kind: "invalid", message: "A reserve figure cannot be negative." };
  }
  if (!DECIMAL_INPUT.test(clean)) {
    return { kind: "invalid", message: "Enter a non-negative number, for example 1,020,000." };
  }
  const decimals = clean.split(".")[1] ?? "";
  if (decimals.length > CLASSIC_DECIMALS) {
    return {
      kind: "invalid",
      message: `Use at most ${CLASSIC_DECIMALS} decimal places; the smallest unit is 0.0000001.`,
    };
  }

  // Validated above, so parseUnits cannot throw here.
  const units = parseUnits(clean);
  if (supply == null || supply === 0n) return { kind: "valid", units, preview: null };

  const bps = (units * 10_000n) / supply;
  const percent = bpsText(bps);
  return {
    kind: "valid",
    units,
    preview: { units, bps, percent, warning: warningFor(bps, percent, code) },
  };
}

function warningFor(bps: bigint, percent: string, code: string): string | null {
  if (bps > MAX_PLAUSIBLE_BPS) {
    return `This reads as ${percent} of ${code}'s supply, above the contract's 10,000% (1,000,000 bps) ceiling, so it will refuse the report. The usual cause is entering the amount in the asset's smallest units: type whole units instead, e.g. 1,020,000 rather than 10200000000000.`;
  }
  if (bps < MIN_PLAUSIBLE_BPS) {
    return `This reads as ${percent} of ${code}'s supply, below the contract's 0.01% (1 bps) floor, so it will refuse the report. A zero figure is refused outright; if you meant a real balance, check the unit: type whole asset units, e.g. 1,020,000 rather than 1.02 or 1,020.`;
  }
  return null;
}
