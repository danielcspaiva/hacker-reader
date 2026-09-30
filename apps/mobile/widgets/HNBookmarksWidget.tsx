import {
  HStack,
  Image,
  Link,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  minimumScaleFactor,
  redacted,
  resizable,
  widgetAccentedRenderingMode,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import type { WidgetStory } from "@/lib/widgets/stories";

import { widgetPalette, type WidgetColors } from "./palette";

export type HNBookmarksProps = {
  /** The most recent bookmarks, newest first. */
  stories: WidgetStory[];
  /** All bookmarks, for the header count. */
  total: number;
  updatedAt: number;
  palette: { light: WidgetColors; dark: WidgetColors };
  /** file:// URI of the app logo in the App Group container. */
  logoUri?: string;
  isSample?: boolean;
};

const SAMPLE_STORIES: WidgetStory[] = [
  "Stories you bookmark in Hacker Reader show up in this widget",
  "Open the app and bookmark a story to save it for later reading",
  "Placeholder headline for the widget preview that is long enough to wrap",
].map((title, index) => ({
  id: index + 1,
  title,
  score: 100,
  time: 0,
  comments: 42,
  domain: "example.com",
}));

const initialProps: HNBookmarksProps = {
  stories: SAMPLE_STORIES,
  total: SAMPLE_STORIES.length,
  updatedAt: 0,
  palette: widgetPalette,
  isSample: true,
};

// NOTE: the 'widget' function is stringified and evaluated in JavaScriptCore inside the
// widget extension. It must be self-contained: no module-scope references, no imports
// other than the JSX components / modifiers, no hooks or async. The helpers below
// intentionally mirror the ones in HNTopStoriesWidget.tsx.
const HNBookmarksWidget = (props: HNBookmarksProps, env: WidgetEnvironment) => {
  "widget";

  // Row counts as in the Top widget: as many as fit on the smallest widget of the family
  // with every title squeezed to one line (measured: header 16, 1-line row 31, gap 7;
  // smallest content areas: large 313, medium 123); SwiftUI grows titles to their line
  // limit in layoutPriority order with the space that is left.
  const MEDIUM_ROWS = 2;
  const LARGE_ROWS = 7;
  const pinTop = frame({
    maxWidth: 10000,
    maxHeight: 10000,
    alignment: "topLeading",
  });

  const family = env.widgetFamily ?? "systemMedium";
  const isLarge = family === "systemLarge";
  const fullColor =
    !env.widgetRenderingMode || env.widgetRenderingMode === "fullColor";
  const scheme = env.colorScheme === "dark" ? "dark" : "light";
  const c = props.palette[scheme];
  const sizeName = isLarge ? "large" : "medium";

  const stories = props.stories ?? [];
  const isSample = props.isSample === true;
  const isEmpty = !isSample && stories.length === 0;
  const now = env.date ? env.date.getTime() : Date.now();
  const total = props.total ?? stories.length;

  const timeAgo = (unix: number) => {
    if (!unix) return "now";
    const s = Math.max(0, Math.floor(now / 1000) - unix);
    if (s < 3600) return Math.max(1, Math.floor(s / 60)) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  };
  const abbrev = (n: number) =>
    n >= 1000 ? (Math.round(n / 100) / 10).toString() + "k" : String(n);

  const ink = fullColor ? c.foreground : "primary";
  const muted = fullColor ? c.mutedForeground : "secondary";
  const faint = fullColor ? c.tertiaryForeground : "secondary";
  const accent = fullColor ? c.primaryInk : "primary";

  const tapParams =
    "source=widget&widgetKind=HNBookmarksWidget&widgetSize=" + sizeName;
  const bookmarksUrl = "hnclient://bookmarks?" + tapParams;
  const storyUrl = (id: number) => "hnclient://story/" + id + "?" + tapParams;

  const bg = [
    containerBackground(fullColor ? c.background : "clear", "widget"),
  ];

  const logoUri = props.logoUri ?? null;
  const logoMark = () =>
    logoUri && fullColor ? (
      <Image
        uiImage={logoUri}
        modifiers={[resizable(), frame({ width: 16, height: 16 })]}
      />
    ) : (
      <ZStack modifiers={[frame({ width: 16, height: 16 })]}>
        <RoundedRectangle
          cornerRadius={5}
          modifiers={[
            foregroundStyle(fullColor ? c.primary : "primary"),
            widgetAccentedRenderingMode("accented"),
            frame({ width: 16, height: 16 }),
          ]}
        />
        <Text
          modifiers={[
            font({ size: 10, weight: "bold" }),
            foregroundStyle(fullColor ? "#FFFFFF" : "secondary"),
          ]}
        >
          Y
        </Text>
      </ZStack>
    );

  const header = (
    <HStack spacing={6} alignment="center">
      {logoMark()}
      <Text
        modifiers={[
          font({ size: 12, weight: "semibold" }),
          foregroundStyle(ink),
          lineLimit(1),
        ]}
      >
        Bookmarks
      </Text>
      <Spacer />
      {!isEmpty && total > 0 ? (
        <Text
          modifiers={[
            font({ size: 11, weight: "medium" }),
            foregroundStyle(faint),
            lineLimit(1),
          ]}
        >
          {String(total)}
        </Text>
      ) : null}
    </HStack>
  );

  const meta = (s: WidgetStory) => (
    <HStack spacing={3} alignment="center">
      <Image
        systemName="arrow.up"
        size={9}
        color={faint}
        modifiers={[foregroundStyle(faint)]}
      />
      <Text
        modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}
      >
        {abbrev(s.score)}
      </Text>
      <Text
        modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}
      >
        {"  " + (s.domain ? s.domain + "  " : "") + timeAgo(s.time)}
      </Text>
    </HStack>
  );

  const row = (s: WidgetStory) => (
    <HStack spacing={8} alignment="firstTextBaseline">
      <Image
        systemName="bookmark.fill"
        size={10}
        color={accent}
        modifiers={[foregroundStyle(accent), frame({ width: 12 })]}
      />
      <VStack spacing={2} alignment="leading">
        <Text
          modifiers={[
            font({ size: 13, weight: "semibold" }),
            foregroundStyle(ink),
            lineLimit(2),
            minimumScaleFactor(0.9),
          ]}
        >
          {s.title}
        </Text>
        {meta(s)}
      </VStack>
      <Spacer />
    </HStack>
  );

  // ---- Empty state ----
  if (isEmpty) {
    return (
      <VStack
        spacing={7}
        alignment="leading"
        modifiers={[pinTop, ...bg, widgetURL(bookmarksUrl)]}
      >
        {header}
        <VStack
          spacing={8}
          alignment="center"
          modifiers={[
            frame({ maxWidth: 10000, maxHeight: 10000, alignment: "center" }),
          ]}
        >
          <Image
            systemName="bookmark"
            size={24}
            color={accent}
            modifiers={[foregroundStyle(accent)]}
          />
          <Text
            modifiers={[
              font({ size: 13, weight: "medium" }),
              foregroundStyle(muted),
              lineLimit(2),
              minimumScaleFactor(0.85),
            ]}
          >
            Bookmark stories to see them here
          </Text>
        </VStack>
      </VStack>
    );
  }

  const rows = stories.slice(0, isLarge ? LARGE_ROWS : MEDIUM_ROWS);
  return (
    <VStack
      spacing={7}
      alignment="leading"
      modifiers={[pinTop, ...bg, widgetURL(bookmarksUrl)]}
    >
      {header}
      <VStack
        spacing={0}
        alignment="leading"
        modifiers={[
          frame({ maxWidth: 10000, maxHeight: 10000, alignment: "topLeading" }),
          ...(isSample ? [redacted("placeholder")] : []),
        ]}
      >
        {rows.flatMap((s, i) => [
          i > 0 ? <Spacer key={"gap" + s.id} minLength={7} /> : null,
          // Earlier bookmarks claim their second line first.
          <Link
            key={String(s.id)}
            destination={isSample ? bookmarksUrl : storyUrl(s.id)}
            modifiers={[layoutPriority(9 - i)]}
          >
            {row(s)}
          </Link>,
        ])}
        <Spacer minLength={0} />
      </VStack>
    </VStack>
  );
};

export default createWidget<HNBookmarksProps>(
  "HNBookmarksWidget",
  HNBookmarksWidget,
  initialProps
);
