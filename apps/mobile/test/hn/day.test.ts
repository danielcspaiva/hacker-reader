import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addDays,
  dayRange,
  dayToPickerDate,
  formatDayLabel,
  isValidDay,
  pickerDateToDay,
  resolveDay,
  todayDay,
  yesterdayDay,
} from "@/lib/format/day";

const NOW = new Date("2026-09-30T23:30:00Z");

describe("day helpers (UTC)", () => {
  it("validates calendar days", () => {
    assert.equal(isValidDay("2026-09-01"), true);
    assert.equal(isValidDay("2024-02-29"), true);
    assert.equal(isValidDay("2026-02-29"), false);
    assert.equal(isValidDay("2026-9-1"), false);
    assert.equal(isValidDay("nope"), false);
  });

  it("today and yesterday follow UTC, not the device zone", () => {
    assert.equal(todayDay(NOW), "2026-09-30");
    assert.equal(yesterdayDay(NOW), "2026-09-29");
    assert.equal(yesterdayDay(new Date("2026-03-01T00:00:00Z")), "2026-02-28");
  });

  it("adds days across month and year ends", () => {
    assert.equal(addDays("2026-09-30", 1), "2026-10-01");
    assert.equal(addDays("2026-01-01", -1), "2025-12-31");
    assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  });

  it("range is a 24h half-open window in unix seconds", () => {
    const { start, end } = dayRange("2026-09-01");
    assert.equal(start, Date.UTC(2026, 8, 1) / 1000);
    assert.equal(end - start, 86_400);
  });

  it("resolveDay defaults, clamps and keeps valid days", () => {
    assert.equal(resolveDay(undefined, NOW), "2026-09-29");
    assert.equal(resolveDay("garbage", NOW), "2026-09-29");
    assert.equal(resolveDay("2026-12-25", NOW), "2026-09-30");
    assert.equal(resolveDay("2026-09-01", NOW), "2026-09-01");
  });

  it("formats the label in UTC", () => {
    assert.equal(formatDayLabel("2026-09-01"), "Sep 1, 2026");
  });

  it("picker date round-trips the same Y/M/D", () => {
    assert.equal(pickerDateToDay(dayToPickerDate("2026-09-01")), "2026-09-01");
    assert.equal(pickerDateToDay(dayToPickerDate("2024-02-29")), "2024-02-29");
  });
});
