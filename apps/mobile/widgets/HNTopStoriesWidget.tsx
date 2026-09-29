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
  "Loading the latest stories from Hacker News",
  "Open Hacker Reader to load the top stories",
  "Your top stories will appear right here",
  "Placeholder headline for the widget preview",
  "Another placeholder headline for the preview",
  "One more placeholder headline for the preview",
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

  const MEDIUM_ROWS = 2;
  const LARGE_ROWS = 7;

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
        modifiers={[widgetURL(top.length ? storyUrl(top[0].id) : feedUrl)]}
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
              modifiers={[font({ size: 12, weight: "medium" }), lineLimit(1)]}
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
              lineLimit(4),
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
  const count = isLarge ? LARGE_ROWS : MEDIUM_ROWS;
  // Medium has ~123pt of content height: two 3-line-capable rows only fit with tighter gaps.
  const listSpacing = isLarge ? 7 : 5;
  const rows = all.slice(0, count);
  return (
    <VStack
      spacing={listSpacing}
      alignment="leading"
      modifiers={[...bg, widgetURL(feedUrl)]}
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
        {rows.map((s, i) => (
          <Link
            key={String(s.id)}
            destination={isSample ? feedUrl : storyUrl(s.id)}
          >
            {row(s, i + 1, 2)}
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
