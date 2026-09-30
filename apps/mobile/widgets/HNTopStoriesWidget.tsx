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
  fixedSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  padding,
  redacted,
  resizable,
  widgetAccentedRenderingMode,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import { widgetPalette, type WidgetColors } from "./palette";

export type WidgetStory = {
  id: number;
  title: string;
  score: number;
  by: string;
  time: number;
  comments: number;
  domain?: string;
};

export type HNTopStoriesProps = {
  stories: WidgetStory[];
  updatedAt: number;
  palette: { light: WidgetColors; dark: WidgetColors };
  /** file:// URI of the app logo in the App Group container. */
  logoUri?: string;
  isSample?: boolean;
};

const SAMPLE_TITLES = [
  "Loading the latest stories from Hacker News, straight to your home screen",
  "Open Hacker Reader once to load the top stories and keep this widget fresh",
  "Your top stories will appear right here, with scores and comment counts",
  "Placeholder headline for the widget preview that is long enough to wrap",
  "Another placeholder headline for the preview that is long enough to wrap",
  "One more placeholder headline for the preview that is long enough to wrap",
];

const SAMPLE_STORIES: WidgetStory[] = SAMPLE_TITLES.map((title, index) => ({
  id: index + 1,
  title,
  score: 100,
  by: "hn",
  time: 0,
  comments: 42,
  domain: index === 0 ? "news.ycombinator.com" : "example.com",
}));

const initialProps: HNTopStoriesProps = {
  stories: SAMPLE_STORIES,
  updatedAt: 0,
  palette: widgetPalette,
  isSample: true,
};

// NOTE: the 'widget' function is stringified and evaluated in JavaScriptCore inside the
// widget extension. It must be self-contained: no module-scope references, no imports
// other than the JSX components / modifiers, no hooks or async.
const HNTopStoriesWidget = (
  props: HNTopStoriesProps,
  env: WidgetEnvironment
) => {
  "widget";

  // Height budget (content area = widget height - 2 * 16pt margins; smallest sizes:
  // small 123, medium 123, large 313). Line heights: 13pt title ~16, 11pt meta ~13,
  // header ~18. 2-line row = 32 + 2 + 13 = 47; 1-line row = 16 + 2 + 13 = 31.
  //   large : 18 + 7 + rows <= 313 (2-line titles, row count from a height budget below)
  //   medium: 18 + 8 + rows <= 123 (row count and line limits from a height budget below)
  //   small : 18 + 6 + (3*18 + 4 + 13) + 6 + 6 + 12 = 119 <= 123 (3-line hero)
  // The lists fill a height budget instead of a fixed row count: env has no widget size,
  // so rows are added while they fit the smallest widget of the family (large
  // 313 - 18 - 7 = 288pt, medium 123 - 18 - 8 = 97pt). A title's line count is estimated
  // at ~42 chars per line (275pt text column at ~5.9pt per 13pt semibold char, less a
  // margin for word wrap). Measured on device: 1-line row 31pt, 2-line row 47pt.
  const LARGE_MAX_ROWS = 7;
  const LARGE_BUDGET = 288;
  const MEDIUM_MAX_ROWS = 2;
  const MEDIUM_BUDGET = 97;
  const CHARS_PER_LINE = 42;
  // Pin content to the top-leading corner; a plain VStack centres (and clips both ends of)
  // content taller than the widget.
  const pinTop = frame({
    maxWidth: 10000,
    maxHeight: 10000,
    alignment: "topLeading",
  });

  const family = env.widgetFamily ?? "systemMedium";
  const isAccessory = family === "accessoryRectangular";
  const fullColor =
    !env.widgetRenderingMode || env.widgetRenderingMode === "fullColor";
  const scheme = env.colorScheme === "dark" ? "dark" : "light";
  const c = props.palette[scheme];
  const loadPrompt = "Open Hacker Reader to load stories";
  let sizeName = "medium";
  if (family === "systemSmall") sizeName = "small";
  else if (family === "systemLarge") sizeName = "large";
  else if (isAccessory) sizeName = "accessory";

  const all = props.stories ?? [];
  const isSample = props.isSample === true || all.length === 0;
  const now = env.date ? env.date.getTime() : Date.now();
  const updatedAt = props.updatedAt ?? 0;
  const stale = !isSample && updatedAt > 0 && now - updatedAt > 6 * 3600 * 1000;

  const timeAgo = (unix: number) => {
    if (!unix) return "now";
    const s = Math.max(0, Math.floor(now / 1000) - unix);
    if (s < 3600) return Math.max(1, Math.floor(s / 60)) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  };
  const abbrev = (n: number) =>
    n >= 1000 ? (Math.round(n / 100) / 10).toString() + "k" : String(n);

  // Colours: custom in full colour, system styles otherwise (tinted / vibrant modes).
  const ink = fullColor ? c.foreground : "primary";
  const muted = fullColor ? c.mutedForeground : "secondary";
  const faint = fullColor ? c.tertiaryForeground : "secondary";
  const rankInk = fullColor ? c.primaryInk : "primary";

  const feedUrl = "hnclient://";
  const storyUrl = (id: number) =>
    "hnclient://story/" +
    id +
    "?source=widget&widgetKind=HNTopStoriesWidget&widgetSize=" +
    sizeName;

  const bg = [
    containerBackground(fullColor ? c.background : "clear", "widget"),
  ];

  const logoUri = props.logoUri ?? null;

  const header = (trailing: string, wordmark = true) => (
    <HStack spacing={6} alignment="center">
      {logoUri && fullColor ? (
        <Image
          uiImage={logoUri}
          modifiers={[resizable(), frame({ width: 18, height: 18 })]}
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
      )}
      {wordmark ? (
        <Text
          modifiers={[
            font({ size: 11, weight: "semibold" }),
            foregroundStyle(muted),
            lineLimit(1),
            minimumScaleFactor(0.8),
          ]}
        >
          Hacker Reader
        </Text>
      ) : null}
      <Spacer />
      <Text
        modifiers={[
          font({ size: 10, weight: "medium" }),
          foregroundStyle(faint),
        ]}
      >
        {trailing}
      </Text>
    </HStack>
  );

  const meta = (s: WidgetStory, showDomain = true) => (
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
      <Image
        systemName="bubble.left"
        size={9}
        color={faint}
        modifiers={[foregroundStyle(faint), padding({ leading: 4 })]}
      />
      <Text
        modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}
      >
        {abbrev(s.comments)}
      </Text>
      <Text
        modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}
      >
        {(showDomain && s.domain ? "  " + s.domain + "  " : "  ") +
          timeAgo(s.time)}
      </Text>
    </HStack>
  );

  const row = (s: WidgetStory, rank: number, titleLines: number) => (
    <HStack spacing={8} alignment="firstTextBaseline">
      <Text
        modifiers={[
          font({ size: 13, weight: "bold" }),
          foregroundStyle(rankInk),
          frame({ width: 14, alignment: "leading" }),
        ]}
      >
        {String(rank)}
      </Text>
      <VStack spacing={2} alignment="leading">
        <Text
          modifiers={[
            font({ size: 13, weight: "semibold" }),
            foregroundStyle(ink),
            lineLimit(titleLines),
            minimumScaleFactor(0.9),
            // Claim the height the lines need; otherwise the stack squeezes the
            // first title to one line even when the widget has room to spare.
            fixedSize({ horizontal: false, vertical: true }),
          ]}
        >
          {s.title}
        </Text>
        {meta(s)}
      </VStack>
      <Spacer />
    </HStack>
  );

  // ---- Lock screen ----
  if (isAccessory) {
    const top = isSample ? [] : all.slice(0, 3);
    return (
      <VStack
        spacing={2}
        alignment="leading"
        modifiers={[
          frame({ maxWidth: 10000, alignment: "leading" }),
          widgetURL(top.length ? storyUrl(top[0].id) : feedUrl),
        ]}
      >
        {top.length === 0 ? (
          <Text
            modifiers={[font({ size: 12, weight: "semibold" }), lineLimit(2)]}
          >
            {loadPrompt}
          </Text>
        ) : (
          top.map((s, i) => (
            <Text
              key={String(s.id)}
              modifiers={[
                font({ size: 12, weight: "medium" }),
                lineLimit(1),
                minimumScaleFactor(0.9),
              ]}
            >
              {String(i + 1) + "  " + s.title}
            </Text>
          ))
        )}
      </VStack>
    );
  }

  const trailing = stale ? "Updated " + timeAgo(updatedAt) + " ago" : "TOP";

  // ---- Small: one hero story ----
  if (family === "systemSmall") {
    const s = all[0];
    return (
      <VStack
        spacing={6}
        alignment="leading"
        modifiers={[
          pinTop,
          ...bg,
          widgetURL(!isSample && s ? storyUrl(s.id) : feedUrl),
        ]}
      >
        {header(trailing, false)}
        <VStack
          spacing={4}
          alignment="leading"
          modifiers={isSample ? [redacted("placeholder")] : []}
        >
          <Text
            modifiers={[
              font({ size: 15, weight: "semibold" }),
              foregroundStyle(ink),
              lineLimit(3),
              minimumScaleFactor(0.9),
            ]}
          >
            {s ? s.title : ""}
          </Text>
          {s ? meta(s, false) : <Text>{""}</Text>}
        </VStack>
        <Spacer />
        {isSample ? (
          <Text
            modifiers={[
              font({ size: 10 }),
              foregroundStyle(faint),
              lineLimit(2),
            ]}
          >
            {loadPrompt}
          </Text>
        ) : (
          <Text modifiers={[font({ size: 10 }), foregroundStyle(faint)]}>
            {"#1 on Hacker News"}
          </Text>
        )}
      </VStack>
    );
  }

  // ---- Medium / Large: list ----
  const isLarge = family === "systemLarge";
  const listSpacing = isLarge ? 7 : 8;
  const maxRows = isLarge ? LARGE_MAX_ROWS : MEDIUM_MAX_ROWS;
  const budget = isLarge ? LARGE_BUDGET : MEDIUM_BUDGET;
  // Each row takes the lines its title needs; the last row that would overflow is
  // truncated to one line if that fits, so the list ends flush instead of leaving a gap.
  const rows: { s: WidgetStory; lines: number }[] = [];
  let used = 0;
  for (const s of all.slice(0, maxRows)) {
    const gap = rows.length > 0 ? listSpacing : 0;
    const lines = (s.title ?? "").length > CHARS_PER_LINE ? 2 : 1;
    if (used + gap + (lines === 2 ? 47 : 31) <= budget) {
      rows.push({ s, lines });
      used += gap + (lines === 2 ? 47 : 31);
    } else {
      if (lines === 2 && used + gap + 31 <= budget) rows.push({ s, lines: 1 });
      break;
    }
  }
  return (
    <VStack
      spacing={listSpacing}
      alignment="leading"
      modifiers={[pinTop, ...bg, widgetURL(feedUrl)]}
    >
      {header(trailing)}
      {isSample ? (
        <Text modifiers={[font({ size: 10 }), foregroundStyle(faint)]}>
          {loadPrompt}
        </Text>
      ) : null}
      <VStack
        spacing={listSpacing}
        alignment="leading"
        modifiers={isSample ? [redacted("placeholder")] : []}
      >
        {rows.map(({ s, lines }, i) => (
          <Link
            key={String(s.id)}
            destination={isSample ? feedUrl : storyUrl(s.id)}
          >
            {row(s, i + 1, lines)}
          </Link>
        ))}
      </VStack>
      <Spacer />
    </VStack>
  );
};

export default createWidget<HNTopStoriesProps>(
  "HNTopStoriesWidget",
  HNTopStoriesWidget,
  initialProps
);
