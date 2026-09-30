import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseDeviceInput } from "../lib/devices";
import { parseDigestPref, readDigestPref } from "../lib/digest/prefs";
import {
  inDeliveryWindow,
  isValidDigestDate,
  localTime,
  previousUtcDate,
  utcDate,
} from "../lib/digest/window";
import type { JsonValue } from "../lib/json";

const at = (iso: string) => Date.parse(iso);

describe("localTime", () => {
  it("reads the wall clock of a zone", () => {
    assert.deepEqual(localTime(at("2026-09-30T05:05:00Z"), "UTC"), {
      date: "2026-09-30",
      hour: 5,
      minute: 5,
    });
    assert.deepEqual(localTime(at("2026-09-30T23:40:00Z"), "Asia/Tokyo"), {
      date: "2026-10-01",
      hour: 8,
      minute: 40,
    });
  });

  it("treats midnight as hour 0, never 24", () => {
    assert.equal(localTime(at("2026-09-30T00:03:00Z"), "UTC")?.hour, 0);
  });

  it("is null for an unknown zone", () => {
    assert.equal(localTime(at("2026-09-30T00:00:00Z"), "Mars/Base"), null);
  });
});

describe("inDeliveryWindow", () => {
  it("is [hour:00, hour:15) on the local clock", () => {
    const zone = "America/Los_Angeles"; // UTC-7 in September
    assert.equal(inDeliveryWindow(at("2026-09-30T15:00:00Z"), zone, 8), true);
    assert.equal(inDeliveryWindow(at("2026-09-30T15:14:59Z"), zone, 8), true);
    assert.equal(inDeliveryWindow(at("2026-09-30T15:15:00Z"), zone, 8), false);
    assert.equal(inDeliveryWindow(at("2026-09-30T14:59:00Z"), zone, 8), false);
    assert.equal(inDeliveryWindow(at("2026-09-30T15:00:00Z"), zone, 9), false);
  });

  it("follows DST: the same local hour is a different UTC hour", () => {
    const zone = "America/New_York";
    // EDT (UTC-4) on 2026-10-31, EST (UTC-5) on 2026-11-02.
    assert.equal(inDeliveryWindow(at("2026-10-31T12:05:00Z"), zone, 8), true);
    assert.equal(inDeliveryWindow(at("2026-10-31T13:05:00Z"), zone, 8), false);
    assert.equal(inDeliveryWindow(at("2026-11-02T13:05:00Z"), zone, 8), true);
    assert.equal(inDeliveryWindow(at("2026-11-02T12:05:00Z"), zone, 8), false);
  });

  it("handles the spring-forward day (the skipped hour never matches)", () => {
    const zone = "America/New_York"; // 2026-03-08: 02:00 -> 03:00
    for (let minute = 0; minute < 24 * 60; minute += 15) {
      const now = at("2026-03-08T00:00:00Z") + minute * 60_000;
      assert.equal(inDeliveryWindow(now, zone, 2), false);
    }
  });

  it("handles the fall-back day (the repeated hour matches twice)", () => {
    const zone = "America/New_York"; // 2026-11-01: 02:00 -> 01:00
    assert.equal(inDeliveryWindow(at("2026-11-01T05:05:00Z"), zone, 1), true);
    assert.equal(inDeliveryWindow(at("2026-11-01T06:05:00Z"), zone, 1), true);
  });

  it("works in half-hour zones: Asia/Kolkata is UTC+5:30", () => {
    const zone = "Asia/Kolkata";
    // 08:00 IST = 02:30 UTC
    assert.equal(inDeliveryWindow(at("2026-09-30T02:30:00Z"), zone, 8), true);
    assert.equal(inDeliveryWindow(at("2026-09-30T02:44:00Z"), zone, 8), true);
    assert.equal(inDeliveryWindow(at("2026-09-30T02:45:00Z"), zone, 8), false);
    assert.equal(inDeliveryWindow(at("2026-09-30T02:00:00Z"), zone, 8), false);
    // The 15 minute cron ticks each land in exactly one window.
    const ticks = [0, 15, 30, 45].map((m) =>
      inDeliveryWindow(at(`2026-09-30T02:${m || "00"}:00Z`), zone, 8)
    );
    assert.deepEqual(ticks, [false, false, true, false]);
  });

  it("works in a quarter-hour zone: Asia/Kathmandu is UTC+5:45", () => {
    // 08:00 NPT = 02:15 UTC
    assert.equal(
      inDeliveryWindow(at("2026-09-30T02:15:00Z"), "Asia/Kathmandu", 8),
      true
    );
  });

  it("is false for an unknown zone", () => {
    assert.equal(inDeliveryWindow(Date.now(), "Nope/Nowhere", 8), false);
  });
});

describe("dates", () => {
  it("formats UTC days", () => {
    assert.equal(utcDate(at("2026-09-30T23:59:59Z")), "2026-09-30");
    assert.equal(previousUtcDate(at("2026-10-01T00:00:01Z")), "2026-09-30");
  });

  it("validates digest dates strictly", () => {
    assert.equal(isValidDigestDate("2026-09-30"), true);
    assert.equal(isValidDigestDate("2028-02-29"), true);
    for (const bad of [
      "2026-02-30",
      "2026-13-01",
      "2026-9-30",
      "2026-09-30T00:00",
      "20260930",
      "../etc",
      "2026-09-30 ",
      "",
    ]) {
      assert.equal(isValidDigestDate(bad), false, bad);
    }
  });
});

describe("digest pref", () => {
  it("accepts enabled and an hour from 0 to 23", () => {
    assert.deepEqual(parseDigestPref({ enabled: true, hour: 0 }), {
      ok: true,
      value: { enabled: true, hour: 0 },
    });
    assert.equal(parseDigestPref({ enabled: false, hour: 23 }).ok, true);
  });

  it("rejects anything else", () => {
    const bads: JsonValue[] = [
      null,
      true,
      [],
      {},
      { enabled: true },
      { enabled: "yes", hour: 8 },
      { enabled: true, hour: 24 },
      { enabled: true, hour: -1 },
      { enabled: true, hour: 7.5 },
      { enabled: true, hour: "8" },
    ];
    for (const bad of bads) {
      assert.equal(parseDigestPref(bad).ok, false, JSON.stringify(bad));
    }
  });

  it("reads a stored pref only when it is on", () => {
    assert.deepEqual(readDigestPref({ digest: { enabled: true, hour: 7 } }), {
      enabled: true,
      hour: 7,
    });
    assert.equal(readDigestPref({ digest: { enabled: false, hour: 7 } }), null);
    assert.equal(readDigestPref({ digest: true }), null);
    assert.equal(readDigestPref({}), null);
  });
});

describe("device registration with prefs.digest", () => {
  const base = {
    platform: "ios",
    appVersion: "1.0.0",
    timezone: "Asia/Kolkata",
  };

  it("accepts the structured pref next to flat ones", () => {
    const parsed = parseDeviceInput({
      ...base,
      prefs: { replies: true, digest: { enabled: true, hour: 8 } },
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.value.prefs, {
        replies: true,
        digest: { enabled: true, hour: 8 },
      });
    }
  });

  it("rejects a malformed digest pref", () => {
    const parsed = parseDeviceInput({
      ...base,
      prefs: { digest: { enabled: true, hour: 99 } },
    });
    assert.equal(parsed.ok, false);
    assert.equal(
      parseDeviceInput({ ...base, prefs: { digest: true } }).ok,
      false
    );
  });
});
