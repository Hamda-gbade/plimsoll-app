import { describe, expect, it } from "vitest";
import { MAX_PLAUSIBLE_BPS, MIN_PLAUSIBLE_BPS, bpsText, checkAmount } from "../lib/report-preview";

/** One whole unit at 7 decimals. */
const UNIT = 10_000_000n;
/** 1,000,000 units circulating. */
const SUPPLY = 1_000_000n * UNIT;

describe("bpsText", () => {
  it("formats basis points as a percentage without floating point", () => {
    expect(bpsText(10_200n)).toBe("102.00%");
    expect(bpsText(1n)).toBe("0.01%");
    expect(bpsText(9_999n)).toBe("99.99%");
    expect(bpsText(1_000_000n)).toBe("10000.00%");
  });
});

describe("checkAmount", () => {
  it("has nothing to say while the field is empty", () => {
    expect(checkAmount("", SUPPLY)).toEqual({ kind: "empty" });
    expect(checkAmount("   ", SUPPLY)).toEqual({ kind: "empty" });
    expect(checkAmount(" , ", SUPPLY)).toEqual({ kind: "empty" });
  });

  it("previews the reserve figure against circulating supply", () => {
    const check = checkAmount("1,020,000", SUPPLY, "PUSD");
    expect(check).toEqual({
      kind: "valid",
      units: 1_020_000n * UNIT,
      preview: {
        units: 1_020_000n * UNIT,
        bps: 10_200n,
        percent: "102.00%",
        warning: null,
      },
    });
  });

  it("updates the ratio when the amount changes", () => {
    const a = checkAmount("1,020,000", SUPPLY, "PUSD");
    const b = checkAmount("999,000", SUPPLY, "PUSD");
    expect(a.kind === "valid" && a.preview?.percent).toBe("102.00%");
    expect(b.kind === "valid" && b.preview?.percent).toBe("99.90%");
  });

  it("updates the ratio when the selected asset's supply changes", () => {
    const a = checkAmount("1,020,000", SUPPLY, "PUSD");
    const b = checkAmount("1,020,000", 2_040_000n * UNIT, "QUSD");
    expect(a.kind === "valid" && a.preview?.bps).toBe(10_200n);
    expect(b.kind === "valid" && b.preview?.bps).toBe(5_000n);
  });

  it("accepts the plausibility bounds themselves", () => {
    // 100 units against 1,000,000 is exactly 1 bps.
    const low = checkAmount("100", SUPPLY, "PUSD");
    expect(low.kind === "valid" && low.preview?.bps).toBe(MIN_PLAUSIBLE_BPS);
    expect(low.kind === "valid" && low.preview?.warning).toBeNull();

    // 100,000,000 units against 1,000,000 is exactly 10,000% (1,000,000 bps).
    const high = checkAmount("100,000,000", SUPPLY, "PUSD");
    expect(high.kind === "valid" && high.preview?.bps).toBe(MAX_PLAUSIBLE_BPS);
    expect(high.kind === "valid" && high.preview?.warning).toBeNull();
  });

  it("warns, naming smallest units, above the ceiling", () => {
    const check = checkAmount("100,000,100", SUPPLY, "PUSD");
    expect(check.kind).toBe("valid");
    if (check.kind !== "valid") return;
    expect(check.preview?.bps).toBe(1_000_001n);
    expect(check.preview?.warning).toMatch(/smallest units/);
    expect(check.preview?.warning).toMatch(/1,000,000 bps/);
    expect(check.preview?.warning).toMatch(/1,020,000/);
  });

  it("warns, naming the unit, below the floor", () => {
    const zero = checkAmount("0", SUPPLY, "PUSD");
    expect(zero.kind === "valid" && zero.preview?.bps).toBe(0n);
    expect(zero.kind === "valid" && zero.preview?.warning).toMatch(/0\.01% \(1 bps\) floor/);

    const tiny = checkAmount("99.9999999", SUPPLY, "PUSD");
    expect(tiny.kind === "valid" && tiny.preview?.bps).toBe(0n);
    expect(tiny.kind === "valid" && tiny.preview?.warning).toMatch(/1\.02|1,020/);
  });

  it("rejects a malformed amount inline, before any submit", () => {
    for (const bad of ["abc", "1.2.3", "1e6", "+5", ".5", "1 2 x"]) {
      const check = checkAmount(bad, SUPPLY);
      expect(check.kind).toBe("invalid");
      if (check.kind === "invalid") expect(check.message.length).toBeGreaterThan(0);
    }
  });

  it("rejects a negative amount and one with too many decimals", () => {
    const negative = checkAmount("-1", SUPPLY);
    expect(negative.kind === "invalid" && negative.message).toMatch(/negative/);

    const decimals = checkAmount("1.12345678", SUPPLY);
    expect(decimals.kind === "invalid" && decimals.message).toMatch(/7 decimal/);
  });

  it("parses separators and up to 7 decimals into smallest units", () => {
    const check = checkAmount(" 1,020,000.5 ", SUPPLY);
    expect(check.kind === "valid" && check.units).toBe(10_200_005_000_000n);
  });

  it("shows no ratio before a supply snapshot exists", () => {
    expect(checkAmount("1,020,000", null, "PUSD")).toEqual({
      kind: "valid",
      units: 1_020_000n * UNIT,
      preview: null,
    });
    expect(checkAmount("1,020,000", undefined, "PUSD")).toEqual({
      kind: "valid",
      units: 1_020_000n * UNIT,
      preview: null,
    });
  });

  it("shows no ratio when the supply snapshot is zero", () => {
    expect(checkAmount("1,020,000", 0n, "PUSD")).toEqual({
      kind: "valid",
      units: 1_020_000n * UNIT,
      preview: null,
    });
  });
});
