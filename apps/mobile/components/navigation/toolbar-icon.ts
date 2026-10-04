import { Platform, type ImageSourcePropType } from "react-native";

import { ICON_GLYPHS, type IconName } from "@/components/ui/icon-names";

/**
 * Icons for `Stack.Toolbar` Menu and Button.
 *
 * iOS takes the SF Symbol name. Android drops an SF Symbol and renders the
 * whole item as nothing unless `icon` is an image. These vectors are Material
 * Symbols; the fill is a mask, and `iconRenderingMode="template"` lets the bar
 * tint it. Sources: Google Material Symbols, Apache 2.0.
 */
const ANDROID_TOOLBAR_ICONS = {
  top: require("@/assets/toolbar/local_fire_department.xml"),
  best: require("@/assets/toolbar/emoji_events.xml"),
  new: require("@/assets/toolbar/schedule.xml"),
  ask: require("@/assets/toolbar/help.xml"),
  show: require("@/assets/toolbar/auto_awesome.xml"),
  jobs: require("@/assets/toolbar/work.xml"),
  filter: require("@/assets/toolbar/filter_list.xml"),
  filterFilled: require("@/assets/toolbar/filter_list.xml"),
  more: require("@/assets/toolbar/more_horiz.xml"),
  bookmark: require("@/assets/toolbar/bookmark.xml"),
  bookmarkFilled: require("@/assets/toolbar/bookmark.xml"),
  pastFrontPages: require("@/assets/toolbar/history.xml"),
  compose: require("@/assets/toolbar/edit.xml"),
  trash: require("@/assets/toolbar/delete.xml"),
  share: require("@/assets/toolbar/share.xml"),
  safari: require("@/assets/toolbar/public.xml"),
  collapseAll: require("@/assets/toolbar/unfold_less.xml"),
  expandAll: require("@/assets/toolbar/unfold_more.xml"),
  hide: require("@/assets/toolbar/visibility_off.xml"),
  mute: require("@/assets/toolbar/volume_off.xml"),
  flag: require("@/assets/toolbar/flag.xml"),
  block: require("@/assets/toolbar/person_off.xml"),
} as const satisfies Partial<Record<IconName, ImageSourcePropType>>;

export type ToolbarIconName = keyof typeof ANDROID_TOOLBAR_ICONS;

export function toolbarIcon(
  name: ToolbarIconName
): (typeof ICON_GLYPHS)[ToolbarIconName]["ios"] | ImageSourcePropType {
  if (Platform.OS === "android") return ANDROID_TOOLBAR_ICONS[name];
  return ICON_GLYPHS[name].ios;
}
