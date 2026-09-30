import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALERT_MIN_POINTS,
  MAX_ALERTS,
  alertLabel,
  isAlert,
  normalizeAlertQuery,
  toAlertPrefs,
  withAlert,
  withoutAlert,
  type Alert,
} from "@/lib/hn/alerts";

const alert = (
  id: string,
  query = "sqlite",
  minPoints: Alert["minPoints"] = 100
): Alert => ({ id, query, minPoints });

describe("normalizeAlertQuery", () => {
  it("collapses whitespace and keeps casing for keywords", () => {
    assert.equal(normalizeAlertQuery("keyword", "  Open   AI "), "Open AI");
  });
  it("rejects empty and over-long keywords", () => {
    assert.equal(normalizeAlertQuery("keyword", "   "), null);
    assert.equal(normalizeAlertQuery("keyword", "x".repeat(61)), null);
    assert.equal(
      normalizeAlertQuery("keyword", "x".repeat(60)),
      "x".repeat(60)
    );
  });
  it("reduces a site to site:<host>", () => {
    for (const input of [
      "Example.com",
      "https://www.example.com/a?b=1",
      "site:example.com",
      "SITE:www.example.com",
    ]) {
      assert.equal(
        normalizeAlertQuery("site", input),
        "site:example.com",
        input
      );
    }
  });
  it("rejects things that are not hosts", () => {
    assert.equal(normalizeAlertQuery("site", "not a site"), null);
    assert.equal(normalizeAlertQuery("site", ""), null);
  });
  it("turns a typed site: keyword into a site alert", () => {
    assert.equal(
      normalizeAlertQuery("keyword", "site:Example.com"),
      "site:example.com"
    );
    assert.equal(normalizeAlertQuery("keyword", "site:"), null);
  });
});

describe("withAlert", () => {
  it("adds a normalised alert", () => {
    const result = withAlert(
      [],
      { kind: "keyword", text: " SQLite ", minPoints: 100 },
      "a1"
    );
    assert.deepEqual(result, { ok: true, alerts: [alert("a1", "SQLite")] });
  });
  it("rejects invalid input", () => {
    assert.deepEqual(
      withAlert([], { kind: "keyword", text: " ", minPoints: 10 }),
      {
        ok: false,
        reason: "invalid",
      }
    );
  });
  it("rejects a duplicate query at the same points, ignoring case", () => {
    const list = [alert("a1", "SQLite", 100)];
    assert.deepEqual(
      withAlert(list, { kind: "keyword", text: "sqlite", minPoints: 100 }),
      {
        ok: false,
        reason: "duplicate",
      }
    );
    assert.equal(
      withAlert(list, { kind: "keyword", text: "sqlite", minPoints: 50 }).ok,
      true
    );
  });
  it("stops at 20 alerts", () => {
    const full = Array.from({ length: MAX_ALERTS }, (_, i) =>
      alert(`a${i}`, `word${i}`)
    );
    assert.deepEqual(
      withAlert(full, { kind: "keyword", text: "more", minPoints: 10 }),
      {
        ok: false,
        reason: "limit",
      }
    );
    assert.equal(
      withAlert(full.slice(1), { kind: "keyword", text: "more", minPoints: 10 })
        .ok,
      true
    );
  });
});

describe("helpers", () => {
  it("removes by id", () => {
    assert.deepEqual(withoutAlert([alert("a"), alert("b")], "a"), [alert("b")]);
  });
  it("guards stored entries", () => {
    assert.equal(isAlert(alert("a")), true);
    assert.equal(isAlert({ id: "a", query: "x", minPoints: 99 }), false);
    assert.equal(isAlert({ id: "", query: "x", minPoints: 10 }), false);
    assert.equal(isAlert({ id: "a", query: "", minPoints: 10 }), false);
    assert.equal(isAlert(null), false);
    assert.deepEqual([...ALERT_MIN_POINTS], [10, 50, 100, 250, 500]);
  });
  it("labels sites without the prefix", () => {
    assert.equal(alertLabel("site:example.com"), "example.com");
    assert.equal(alertLabel("SQLite"), "SQLite");
  });
  it("sends exactly id, query and minPoints", () => {
    const extra = { ...alert("a"), note: "x" };
    assert.deepEqual(toAlertPrefs([extra]), [alert("a")]);
  });
});
