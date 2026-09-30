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

  // Sizing is left to SwiftUI's stack layout (the flexbox of widgets). env has no widget
  // size, and a stack can stretch or squeeze views but cannot drop one that does not fit,
  // so the only thing decided here is HOW MANY stories to show: as many as fit on the
  // smallest widget of the family with every title squeezed to one line. On that minimum
  // SwiftUI then grows titles (up to their line limit) in layoutPriority order, hero
  // first, and flexible Spacers take whatever is still left, so every widget fills its
  // height evenly on every iPhone.
  // There is no header, so stories get the full height. The logo (with "Updated Nh ago"
  // beside it when the stories are stale) sits in the bottom-right corner of every size.
  // Minimum heights (measured on device): logo mark 16, 1-line compact row 31
  // (13pt title 16 + 2 + 11pt meta 14), hero eyebrow 14 + 3 + title + 3 + meta 14,
  // 17pt title line 21, 15pt 19, 12pt 15. Smallest content areas (widget - 2 * 16pt
  // margins): large 313, medium 123.
  //   large : 313 - hero - 7 gap - 22 logo line = rows area; rows = (area + 7) / 38.
  //           The hero keeps its estimated lines (a 17pt line holds ~32 chars on the
  //           smallest widget), so a long #1 costs a row rather than being cut.
  //   medium: 123 for the columns. Left: the #1 hero (17pt, up to 3 lines) with its
  //           stats pinned to the bottom. Right: #2 and #3 as eyebrow + 13pt title (no
  //           stats), up to 3 lines each, then the logo line (16 + 6).
  const LARGE_CONTENT = 313;
  const LARGE_HERO_CHARS = 32;
  const LARGE_MAX_ROWS = 6;
  const MEDIUM_SIDE_WIDTH = 140;
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

  const staleLabel = stale ? "Updated " + timeAgo(updatedAt) + " ago" : null;

  // Bottom-right brand: the logo, preceded by the stale label when there is one.
  const brand = (withStale = true) => (
    <HStack spacing={5} alignment="center">
      {withStale && staleLabel ? (
        <Text
          modifiers={[
            font({ size: 10, weight: "medium" }),
            foregroundStyle(faint),
            lineLimit(1),
            minimumScaleFactor(0.8),
          ]}
        >
          {staleLabel}
        </Text>
      ) : null}
      {logoMark()}
    </HStack>
  );

  const meta = (
    s: WidgetStory,
    showDomain = true,
    showComments = true,
    tail: ReturnType<typeof brand> | null = null
  ) => (
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
      {showComments ? (
        <Image
          systemName="bubble.left"
          size={9}
          color={faint}
          modifiers={[foregroundStyle(faint), padding({ leading: 4 })]}
        />
      ) : null}
      {showComments ? (
        <Text
          modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}
        >
          {abbrev(s.comments)}
        </Text>
      ) : null}
      <Text
        modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}
      >
        {(showDomain && s.domain ? "  " + s.domain + "  " : "  ") +
          timeAgo(s.time)}
      </Text>
      {tail ? <Spacer minLength={6} /> : null}
      {tail}
    </HStack>
  );

  const row = (
    s: WidgetStory,
    rank: number,
    maxLines: number,
    size = 13,
    short = false,
    tail: ReturnType<typeof brand> | null = null
  ) => (
    <HStack spacing={size < 13 ? 6 : 8} alignment="firstTextBaseline">
      <Text
        modifiers={[
          font({ size, weight: "bold" }),
          foregroundStyle(rankInk),
          frame({ width: size < 13 ? 10 : 14, alignment: "leading" }),
        ]}
      >
        {String(rank)}
      </Text>
      <VStack spacing={2} alignment="leading">
        {/* No fixedSize: the title may squeeze to one line when space is short. */}
        <Text
          modifiers={[
            font({ size, weight: "semibold" }),
            foregroundStyle(ink),
            lineLimit(maxLines),
            minimumScaleFactor(0.9),
          ]}
        >
          {s.title}
        </Text>
        {meta(s, !short, !short, tail)}
      </VStack>
      <Spacer />
    </HStack>
  );

  // Eyebrow shared by every emphasised story: orange rank, then the domain.
  const eyebrow = (
    s: WidgetStory,
    rank: number,
    tail: ReturnType<typeof brand> | null = null
  ) => (
    <HStack spacing={5} alignment="firstTextBaseline">
      <Text
        modifiers={[
          font({ size: 11, weight: "bold" }),
          foregroundStyle(rankInk),
        ]}
      >
        {String(rank)}
      </Text>
      <Text
        modifiers={[
          font({ size: 11, weight: "semibold" }),
          foregroundStyle(muted),
          lineLimit(1),
          minimumScaleFactor(0.8),
        ]}
      >
        {s.domain ? s.domain : "Hacker News"}
      </Text>
      <Spacer />
      {tail}
    </HStack>
  );

  // Story block with emphasis: eyebrow (orange rank + domain), title, meta.
  const hero = (
    s: WidgetStory,
    rank: number,
    titleSize: number,
    titleLines: number,
    showComments: boolean,
    minScale = 0.9,
    corner: ReturnType<typeof brand> | null = null,
    // Push the meta line to the bottom of a full-height column.
    stretch = false
  ) => (
    <VStack
      spacing={3}
      alignment="leading"
      modifiers={
        stretch ? [frame({ maxHeight: 10000, alignment: "topLeading" })] : []
      }
    >
      {eyebrow(s, rank, corner)}
      <Text
        modifiers={[
          font({ size: titleSize, weight: "semibold" }),
          foregroundStyle(ink),
          lineLimit(titleLines),
          minimumScaleFactor(minScale),
        ]}
      >
        {s.title}
      </Text>
      {stretch ? <Spacer minLength={3} /> : null}
      {meta(s, false, showComments)}
    </VStack>
  );

  const lineCount = (title: string, chars: number, max: number) =>
    Math.min(max, Math.max(1, Math.ceil((title ?? "").length / chars)));

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
        <VStack
          spacing={4}
          alignment="leading"
          modifiers={isSample ? [redacted("placeholder")] : []}
        >
          <Text
            modifiers={[
              font({ size: 20, weight: "semibold" }),
              foregroundStyle(ink),
              lineLimit(4),
              // Short titles stay large; long ones shrink to fit four lines.
              minimumScaleFactor(0.7),
              layoutPriority(1),
            ]}
          >
            {s ? s.title : ""}
          </Text>
          {s ? meta(s, false) : <Text>{""}</Text>}
        </VStack>
        <Spacer />
        <HStack spacing={6} alignment="center">
          <Text
            modifiers={[
              font({ size: 10 }),
              foregroundStyle(faint),
              lineLimit(2),
              minimumScaleFactor(0.8),
            ]}
          >
            {isSample ? loadPrompt : (staleLabel ?? "#1 on Hacker News")}
          </Text>
          <Spacer minLength={0} />
          {brand(false)}
        </HStack>
      </VStack>
    );
  }

  const first = all[0];
  const sampleMods = isSample ? [redacted("placeholder")] : [];
  const linkTo = (s: WidgetStory) => (isSample ? feedUrl : storyUrl(s.id));
  const sampleNote = isSample ? (
    <Text modifiers={[font({ size: 10 }), foregroundStyle(faint)]}>
      {loadPrompt}
    </Text>
  ) : null;

  // Full-height column: its children are laid out top to bottom, and the Spacers between
  // them share whatever the prioritised content leaves over.
  const fill = frame({
    maxWidth: 10000,
    maxHeight: 10000,
    alignment: "topLeading",
  });

  // ---- Medium: hero on the left, #2 and #3 on the right ----
  if (family !== "systemLarge") {
    const side = all.slice(1, 3);
    return (
      <VStack
        spacing={8}
        alignment="leading"
        modifiers={[pinTop, ...bg, widgetURL(feedUrl)]}
      >
        {sampleNote}
        <HStack spacing={16} alignment="top" modifiers={[fill, ...sampleMods]}>
          {first ? (
            <Link destination={linkTo(first)}>
              <VStack alignment="leading" modifiers={[fill, layoutPriority(3)]}>
                {hero(first, 1, 20, 3, true, 0.75, null, true)}
              </VStack>
            </Link>
          ) : null}
          {side.length > 0 ? (
            <VStack
              spacing={0}
              alignment="leading"
              modifiers={[
                frame({ width: MEDIUM_SIDE_WIDTH }),
                frame({ maxHeight: 10000, alignment: "topLeading" }),
              ]}
            >
              {/* #2 at the top, #3 below, the logo in the bottom-right corner level
                  with the hero's stats. Side stories drop the stats. */}
              {side.flatMap((s, i) => [
                i > 0 ? <Spacer key={"gap" + s.id} minLength={10} /> : null,
                <Link
                  key={String(s.id)}
                  destination={linkTo(s)}
                  modifiers={[layoutPriority(2 - i)]}
                >
                  <VStack spacing={3} alignment="leading">
                    {eyebrow(s, i + 2)}
                    <Text
                      modifiers={[
                        font({ size: 13, weight: "semibold" }),
                        foregroundStyle(ink),
                        // #2 claims its lines first; #3 takes what is left.
                        lineLimit(3),
                        minimumScaleFactor(0.85),
                      ]}
                    >
                      {s.title}
                    </Text>
                  </VStack>
                </Link>,
              ])}
              <Spacer minLength={6} />
              <HStack spacing={0} alignment="center">
                <Spacer minLength={0} />
                {brand()}
              </HStack>
            </VStack>
          ) : null}
        </HStack>
      </VStack>
    );
  }

  // ---- Large: hero, then compact rows ----
  const heroLines = first ? lineCount(first.title, LARGE_HERO_CHARS, 3) : 1;
  const rowsArea = LARGE_CONTENT - (34 + 21 * heroLines) - 7 - 22;
  const rows = all.slice(
    1,
    1 + Math.min(LARGE_MAX_ROWS, Math.floor((rowsArea + 7) / 38))
  );
  return (
    <VStack
      spacing={7}
      alignment="leading"
      modifiers={[pinTop, ...bg, widgetURL(feedUrl)]}
    >
      {sampleNote}
      <VStack spacing={0} alignment="leading" modifiers={[fill, ...sampleMods]}>
        {first ? (
          <Link destination={linkTo(first)} modifiers={[layoutPriority(10)]}>
            <VStack
              alignment="leading"
              modifiers={[frame({ maxWidth: 10000, alignment: "leading" })]}
            >
              {hero(first, 1, 17, heroLines, true)}
            </VStack>
          </Link>
        ) : null}
        {first && rows.length > 0 ? <Spacer minLength={7} /> : null}
        {rows.flatMap((s, i) => [
          <Spacer key={"gap" + s.id} minLength={7} />,
          // Earlier stories claim their second line first.
          <Link
            key={String(s.id)}
            destination={linkTo(s)}
            modifiers={[layoutPriority(9 - i)]}
          >
            {row(s, i + 2, 2, 13, false, null)}
          </Link>,
        ])}
        <Spacer minLength={6} />
        <HStack spacing={0} alignment="center">
          <Spacer minLength={0} />
          {brand()}
        </HStack>
      </VStack>
    </VStack>
  );
};

export default createWidget<HNTopStoriesProps>(
  "HNTopStoriesWidget",
  HNTopStoriesWidget,
  initialProps
);
