import type { SymbolViewProps } from "expo-symbols";

type GlyphName = Exclude<SymbolViewProps["name"], string>;

/**
 * Semantic icon registry: screens ask for a meaning, not a glyph. iOS uses the
 * SF Symbol, Android the Material Symbol. Add new meanings here, not inline.
 */
export const ICON_GLYPHS = {
  // navigation
  chevronRight: { ios: "chevron.right", android: "chevron_right" },
  chevronDown: { ios: "chevron.down", android: "expand_more" },
  chevronUp: { ios: "chevron.up", android: "expand_less" },
  close: { ios: "xmark", android: "close" },
  checkmark: { ios: "checkmark", android: "check" },
  more: { ios: "ellipsis", android: "more_horiz" },
  external: { ios: "arrow.up.right", android: "north_east" },
  // story actions
  upvote: { ios: "arrow.up", android: "arrow_upward" },
  comments: { ios: "bubble.left", android: "chat_bubble" },
  reply: { ios: "arrowshape.turn.up.left", android: "reply" },
  share: { ios: "square.and.arrow.up", android: "share" },
  bookmark: { ios: "bookmark", android: "bookmark" },
  bookmarkFilled: { ios: "bookmark.fill", android: "bookmark" },
  compose: { ios: "square.and.pencil", android: "edit" },
  flag: { ios: "flag", android: "flag" },
  block: { ios: "person.slash", android: "person_off" },
  safari: { ios: "safari", android: "public" },
  refresh: { ios: "arrow.clockwise", android: "refresh" },
  hide: { ios: "eye.slash", android: "visibility_off" },
  link: { ios: "link", android: "link" },
  favorite: { ios: "star", android: "star" },
  send: { ios: "paperplane.fill", android: "send" },
  // metadata
  time: { ios: "clock", android: "schedule" },
  user: { ios: "person", android: "person" },
  userFilled: { ios: "person.fill", android: "person" },
  karma: { ios: "sparkles", android: "auto_awesome" },
  calendar: { ios: "calendar", android: "calendar_today" },
  // categories and tabs
  top: { ios: "flame", android: "local_fire_department" },
  new: { ios: "clock", android: "schedule" },
  ask: { ios: "questionmark.bubble", android: "help" },
  show: { ios: "sparkle", android: "auto_awesome" },
  jobs: { ios: "briefcase", android: "work" },
  stories: { ios: "newspaper", android: "article" },
  storiesFilled: { ios: "newspaper.fill", android: "article" },
  search: { ios: "magnifyingglass", android: "search" },
  settings: { ios: "gearshape", android: "settings" },
  settingsFilled: { ios: "gearshape.fill", android: "settings" },
  // system
  login: { ios: "person.crop.circle.badge.checkmark", android: "login" },
  logout: { ios: "rectangle.portrait.and.arrow.right", android: "logout" },
  trash: { ios: "trash", android: "delete" },
  document: { ios: "doc.text", android: "description" },
  code: { ios: "chevron.left.forwardslash.chevron.right", android: "code" },
  // states
  warning: { ios: "exclamationmark.triangle", android: "warning" },
  error: { ios: "exclamationmark.circle", android: "error" },
  success: { ios: "checkmark.circle.fill", android: "check_circle" },
  offline: { ios: "wifi.slash", android: "wifi_off" },
  searchEmpty: {
    ios: "doc.text.magnifyingglass",
    android: "search_off",
  },
} as const satisfies Record<string, GlyphName>;

export type IconName = keyof typeof ICON_GLYPHS;

/**
 * Props for `NativeTabs.Trigger.Icon`: outline glyph, and the `selected` one
 * (defaults to the same glyph). Spread onto the Icon.
 */
export function tabIcon(name: IconName, selected: IconName = name) {
  return {
    sf: {
      default: ICON_GLYPHS[name].ios,
      selected: ICON_GLYPHS[selected].ios,
    },
    md: {
      default: ICON_GLYPHS[name].android,
      selected: ICON_GLYPHS[selected].android,
    },
  } as const;
}
