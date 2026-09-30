import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  APP_ICON_IDS,
  APP_ICONS,
  appIconFromNativeName,
  appIconOption,
  isGatedAppIcon,
} from "@/lib/app-icons/icons";

type IconPluginProps = { name: string; ios: string }[];
interface AppConfig {
  expo: { plugins: (string | [string, IconPluginProps] | [string, object])[] };
}

const appRoot = new URL("../", import.meta.url);

describe("app icons", () => {
  it("lists every id once, default first", () => {
    assert.deepEqual(
      APP_ICONS.map((icon) => icon.id),
      [...APP_ICON_IDS]
    );
    assert.equal(APP_ICONS[0].id, "default");
    assert.equal(APP_ICONS[0].nativeName, null);
  });

  it("maps iOS icon names back to ids", () => {
    assert.equal(appIconFromNativeName(null), "default");
    assert.equal(appIconFromNativeName(undefined), "default");
    assert.equal(appIconFromNativeName("Midnight"), "midnight");
    assert.equal(appIconFromNativeName("Removed"), "default");
    for (const icon of APP_ICONS) {
      assert.equal(appIconFromNativeName(icon.nativeName), icon.id);
      assert.equal(appIconOption(icon.id), icon);
    }
  });

  it("gates everything but the default icon", () => {
    assert.equal(isGatedAppIcon("default"), false);
    for (const icon of APP_ICONS.slice(1)) {
      assert.equal(isGatedAppIcon(icon.id), true);
    }
  });

  it("registers the same icons in app.json, with generated files", () => {
    const config: AppConfig = JSON.parse(
      readFileSync(new URL("app.json", appRoot), "utf8")
    );
    const entry = config.expo.plugins.find(
      (plugin): plugin is [string, IconPluginProps] =>
        Array.isArray(plugin) && plugin[0] === "expo-alternate-app-icons"
    );
    assert.ok(entry, "expo-alternate-app-icons plugin entry");
    const registered = entry[1];
    assert.deepEqual(
      registered.map((icon) => icon.name),
      APP_ICONS.flatMap((icon) => (icon.nativeName ? [icon.nativeName] : []))
    );
    for (const icon of registered) {
      assert.ok(existsSync(new URL(icon.ios, appRoot)), icon.ios);
    }
  });
});
