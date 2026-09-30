# Design language

Hacker Reader is solid, warm and native. Content sits on solid surfaces; Liquid Glass belongs to system chrome only. Raw colours live in `constants/colors.ts` (dependency-free, so config plugins, tests and the widget palette can import them); `constants/theme.ts` re-exports them and adds radii, spacing, fonts and the wash alphas. No hex literals elsewhere; `widgets/palette.ts` picks its tokens from `constants/colors.ts`.

## Palette

Read colours with `useTheme().colors`. Light is white cards on a warm grey page (`#F4F0EC`, OKLCH hue about 72°, the same warm family as the text and Dark Mode; HN's own `#F6F6EF` leans olive next to the orange); dark is a warm deep charcoal-brown ("HN at night"), never pure black.

| Token                            | Light                             | Dark                              | Role                                          |
| -------------------------------- | --------------------------------- | --------------------------------- | --------------------------------------------- |
| `background`                     | `#F4F0EC`                         | `#17130F`                         | page                                          |
| `card`                           | `#FFFFFF`                         | `#272119`                         | solid content surface                         |
| `cardPressed`                    | `#F6F3F0`                         | `#2F2820`                         | pressed row/card fill                         |
| `muted`                          | `#EDE9E3`                         | `#2D2721`                         | tracks, chips, skeletons, icon buttons        |
| `foreground`                     | `#1F1B16`                         | `#F3EDE3`                         | primary text                                  |
| `mutedForeground`                | `#6A645A`                         | `#A9A194`                         | secondary text (HN warm grey)                 |
| `tertiaryForeground`             | `#8A8377`                         | `#857D70`                         | decorative text, placeholders, chevrons       |
| `primary`                        | `#FF7A18`                         | `#FF7A18`                         | logo orange: fills, tint, glyphs              |
| `primaryForeground`              | `#1F1B16`                         | `#1A1208`                         | text on a primary fill                        |
| `primaryInk`                     | `#A84700`                         | `#FF8F3D`                         | text-safe orange: links, small orange text    |
| `primaryWash`                    | `#FF7A1824`                       | `#FF7A182E`                       | tinted fill (secondary button)                |
| `rank`                           | `#F46911`                         | `#F46911`                         | feed rank numerals (the book's darker orange) |
| `border`                         | `#3C2D1424`                       | `#F3EDE324`                       | outlines (fields)                             |
| `separator`                      | `#3C2D1418`                       | `#F3EDE31A`                       | hairline between rows                         |
| `success` / `warning` / `danger` | `#2B7A33` / `#9A5B00` / `#C0311D` | `#5DBB63` / `#E5A03A` / `#FF6B57` | status                                        |
| `codeBackground`                 | `#EDE9E3`                         | `#2D2721`                         | code blocks                                   |

Thread-depth rails (`colors.rail[depth % 6]`): shades of one orange, strongest at the top level and receding with depth (no rainbow):
light `#F0914B #F3A66D #F5BA8E #F7CBAA #F9D9C1 #FBE4D3`, dark `#C8671F #A85A20 #8B4D20 #72421E #5C371C #4A2E1A`. Both ramps sit on the `primary` hue (25.5°). Deliberately quiet: rails orient, they should not compete with the text.

Tile hues (`colors.tile.<hue>`, glyph colour; `IconTile` washes it): `orange blue green red indigo gray teal amber pink`.

### Contrast (WCAG)

| Pair                                             | Light                      | Dark               |
| ------------------------------------------------ | -------------------------- | ------------------ |
| `foreground` on `background`                     | 15.10                      | 15.87              |
| `foreground` on `card`                           | 17.12                      | 13.68              |
| `mutedForeground` on `background`                | 5.17                       | 7.23               |
| `mutedForeground` on `card`                      | 5.86                       | 6.23               |
| `mutedForeground` on `muted`                     | 4.85                       | 5.77               |
| `primaryInk` on `background`                     | 5.19                       | 8.14               |
| `primaryInk` on `card`                           | 5.89                       | 7.02               |
| `primaryForeground` on `primary`                 | 6.56                       | 7.10               |
| `success` / `warning` / `danger` on `card`       | 5.34 / 5.43 / 5.68         | 6.64 / 7.15 / 5.69 |
| `tertiaryForeground` on `card` (decorative, 3:1) | 3.75                       | 3.92               |
| `rank` on `card` (numerals)                      | 3.05 (below 4.5, accepted) | 5.22               |
| rails (decorative)                               | quiet by design, below 3:1 | same               |

`primary` is the app icon's orange (`#FF7A18`, sampled from `ybook.png`), the same in both modes. White on it is only 2.61:1, so primary fills carry dark ink (`primaryForeground`). Orange text on paper is always `primaryInk` (`Text tone="primary"` does this). Never use `primary` for small text on the page.

## Surfaces

- Content never gets a glass treatment: the only glass is the system's own (native tab bar and header, and at most one floating pinned bar or composer). Story cards, skeletons, link previews, submission cards, filters and inputs are solid.
- `Card`: `card` on `background`, radius 24, no border, no shadow. Separation comes from the wash.
- A neutral fill that sits directly on the page (not inside a card) uses `card`, not `muted`: in Light Mode `muted` barely separates from the page (`Badge surface="page"`, the story vote pill).
- `ListSection`: radius 20, hairline separators inset 16.
- Every rounded surface sets `borderCurve: "continuous"`. Radii: 12 controls, 20 lists, 24 cards, pill for badges (`Radius` in the theme).
- Content gutter is 16 (`GUTTER`).

## Typography

One `Text`, system font (SF), Dynamic Type on. Serif (`serif` prop, New York) only for story titles on the story detail hero.

| variant    | size / line | weight   | notes                              |
| ---------- | ----------- | -------- | ---------------------------------- |
| `hero`     | 40 / 46     | bold     | -0.8 tracking, tabular             |
| `display`  | 34 / 41     | bold     | -0.6 tracking                      |
| `headline` | 28 / 34     | bold     | -0.4 tracking, story hero title    |
| `title`    | 22 / 28     | bold     |                                    |
| `subtitle` | 17 / 22     | semibold |                                    |
| `body`     | 17 / 22     | regular  |                                    |
| `callout`  | 15 / 20     | regular  |                                    |
| `caption`  | 13 / 18     | regular  |                                    |
| `label`    | 11 / 13     | semibold | uppercase, +0.6 tracking (eyebrow) |

Tones: `default muted tertiary primary destructive success warning`. Use `numeric` for counts and scores.

## Components

All in `@/components/ui/*` (barrel: `@/components/ui`); file names are kebab-case. This section is the single contract: if a prop is not listed here, it does not exist.

```tsx
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Icon,
  IconTile,
  ListRow,
  ListSection,
  ListSlot,
  Screen,
  ScrollScreen,
  Segmented,
  Skeleton,
  Text,
  ThemedHost,
  ThemedRefreshControl,
  useScreenBottomInset,
  tabIcon,
  ICON_GLYPHS,
  type IconName,
  type BadgeTone,
  type CardProps,
  type SegmentedOption,
  type SegmentedProps,
  type TextProps,
  type TextTone,
  type TextVariant,
} from "@/components/ui";
import { useTheme } from "@/hooks/use-theme";
import {
  Radius,
  CARD_GAP,
  GUTTER,
  Fonts,
  WashAlpha,
  withAlpha,
} from "@/constants/theme";
import type { ThemeColors, TileHue, ColorScheme } from "@/constants/theme";
```

| Component                | Props                                                                                                      | Notes                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `Text`                   | `variant tone weight numeric serif` + RN TextProps                                                         | `weight` = `regular medium semibold bold`; `serif` is New York on iOS; default `body` / `default`   |
| `Icon`                   | `name` (required, `IconName`) `size=20 color weight accessibilityLabel style`                              | decorative unless labelled; registry in `icon-names.ts`                                             |
| `Screen`                 | `children`                                                                                                 | page background, for screens that own a FlashList                                                   |
| `ScrollScreen`           | `onRefresh refreshing gap` + ScrollView props                                                              | 16 gutter, `contentInsetAdjustmentBehavior="automatic"`, themed refresh                             |
| `ThemedRefreshControl`   | RefreshControlProps                                                                                        | for a FlashList `refreshControl`                                                                    |
| `useScreenBottomInset()` |                                                                                                            | bottom padding for list content (`insets.bottom + 24` iOS, `100 + insets.bottom` Android)           |
| `Card`                   | `padding=16 style`, `onPress?`                                                                             | static: a plain View. With `onPress`: scale 0.98, `cardPressed` fill, selection haptic              |
| `ListSection`            | `title footer accessory`                                                                                   | children are `ListRow`s or a `ListSlot`; hairline separators inset 16                               |
| `ListRow`                | `title subtitle value leading trailing destructive onPress chevron disabled titleLines accessibilityLabel` | min height 52; a button only when `onPress` is given; selection haptic                              |
| `ListSlot`               | `padding=16`                                                                                               | padded non-row content inside a `ListSection` (a control, a paragraph)                              |
| `IconTile`               | `name hue size=30`                                                                                         | tinted wash plus hued glyph; `hue: TileHue`                                                         |
| `Badge`                  | `label tone variant icon surface`                                                                          | tones `neutral primary success warning danger`, variants `soft solid`; `surface="page"` on the page |
| `Button`                 | `label onPress variant size icon loading disabled fullWidth accessibilityLabel`                            | variants `primary secondary ghost destructive`, sizes `sm md lg` (36/44/52), light impact           |
| `EmptyState`             | `icon title message action fill`                                                                           | ContentUnavailableView style; `action` is usually a `Button`, `fill` centres in the space           |
| `Skeleton`               | `width height radius style`                                                                                | Reanimated pulse, reduced-motion aware; compose inside a `Card`                                     |
| `Field`                  | TextInputProps                                                                                             | 48pt, radius 12, primary border on focus                                                            |
| `Segmented<T>`           | `options value onChange style`                                                                             | native SwiftUI segmented Picker on iOS (scheme from `ThemedHost`), RN fallback elsewhere            |
| `ThemedHost`             | `Host` props                                                                                               | drop-in for `@expo/ui/swift-ui` `Host`; injects the resolved scheme and `seedColor = primary`       |

Rules:

- Wrap every SwiftUI tree (Picker, Switch, Menu, Form) in `ThemedHost`; never import `Host` directly.
- The primitives already fire the right haptic; do not add a second one on `Card`, `ListRow`, `Button` or `Segmented`.
- Badge colours come from typed tone tables in `badge.tsx`; tinted washes use the named alphas in `WashAlpha` (`badge`, `destructive`, `tileLight`, `tileDark`).
- FlashList screens: wrap in `Screen`, set `contentInsetAdjustmentBehavior="automatic"`, `contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: useScreenBottomInset() }}` and `refreshControl={<ThemedRefreshControl ... />}`.

```tsx
<ScrollScreen>
  <ListSection title="Appearance" footer="Follows the system by default.">
    <ListRow
      leading={<IconTile name="settings" hue="indigo" />}
      title="Theme"
      value="System"
      onPress={openTheme}
    />
  </ListSection>
  <Card onPress={open}>
    <Text variant="subtitle">Title</Text>
    <Text variant="caption" tone="muted">
      128 points
    </Text>
  </Card>
</ScrollScreen>
```

## Tokens

Read them with `const { scheme, colors } = useTheme()` (`scheme` is `"light" | "dark"`). Never import `Colors[...]` in components; never write a hex literal.

- Surface and ink: `background`, `card`, `cardPressed`, `muted`, `foreground`, `mutedForeground`, `tertiaryForeground` (decorative only).
- Brand: `primary`, `primaryForeground` (dark ink on a primary fill, never white), `primaryInk` (text-safe orange), `primaryWash` (tinted fill).
- Lines: `border`, `separator`. Semantic: `success warning danger codeBackground`.
- `rail`: 6-tuple for comment depth, `colors.rail[depth % colors.rail.length]`. `tile`: `Record<TileHue, string>`.
- `withAlpha(color, alpha)` appends an alpha channel to a `#RRGGBB` token.
- `Radius`: `control 12`, `list 20`, `card 24`, `pill 999`. `GUTTER = 16`, `CARD_GAP = 8` (owned by `LinkCard` and `StoryCardSkeleton`). `Fonts`: `sans serif rounded mono` per platform.

## Headers and tabs

`components/navigation/`:

- `header-options.tsx`: `useHeaderOptions(variant)` returns the option object for a route declared on any Stack. Variants: `large` (tab roots, native large title), `inline` (detail screens), `sheet` (modal flows: opaque bar, `formSheet` on iOS / `modal` on Android, grabber, close button in `headerRight`).
- `large-title-stack.tsx`: `LargeTitleStack` (the `large` variant for a tab's stack) and `useHeaderOverlapInset()` (top padding for a screen that draws fixed content with no scroll view to inset; iOS only).
- `modal-close-button.tsx`: `ModalCloseButton`, used by the `sheet` variant.
- `navigation-theme.ts`: `useNavigationTheme()` builds the React Navigation theme from tokens; `app/_layout.tsx` passes it to `ThemeProvider`.

Rules:

- iOS: transparent header with no `headerBlurEffect` so iOS 26 draws glass; large title in `foreground`; tint is `primary`; back is `headerBackButtonDisplayMode: "minimal"`. Scroll views use `contentInsetAdjustmentBehavior="automatic"` (`ScrollScreen` does; for FlashList set it on the list). Do not set `headerBlurEffect` or a header background colour on iOS.
- Android: opaque header in the page colour, left-aligned title.
- Root stack: `story/[id]`, `user/[id]` and `user/[id]/submissions` use `inline` with `headerShown: true`; `auth/login` uses `sheet`.
- Tabs: `NativeTabs` in `app/(tabs)/_layout.tsx`, tint `primary`, `minimizeBehavior="never"`. Triggers stay literal JSX (NativeTabs has crashed on mapped children); icons come from `tabIcon(name, selectedName)` in `icon-names.ts`, which returns the `sf`/`md` props with filled variants when selected.
- Scope is chrome, not content: the feed category belongs in a `Stack.Toolbar` menu, not a pill in the list.
- The feed's large title names the category (`CATEGORY_TITLES`: "Top Stories", "New Stories", "Ask HN", "Show HN", "Jobs"). The category is switched from the header-right menu: a native `Stack.Toolbar.Menu` whose icon is the current category's SF Symbol, with a checkmark on the current item and `accessibilityLabel="Category: Top"`. Don't fake a text-plus-chevron trigger; a bar item cannot combine text with an SF Symbol and the result reads as non-native.
- `Stack.Toolbar` for screen actions, `Stack.SearchBar` for search, `Alert.alert` for confirmations.
- Toolbar budget: at most two items on the right (ideally one primary action plus a `more` menu). Everything else goes in that `Stack.Toolbar.Menu`, with destructive actions in an inline section. Never host `@expo/ui` controls in `headerRight`; use `Stack.Toolbar.Button` / `Stack.Toolbar.Menu`.
- An action that belongs to content lives on the content: upvote is the points pill in the story hero, not a toolbar button.

## Icons

- SF Symbols only, via the `ICON_GLYPHS` registry (`components/ui/icon-names.ts`); `Icon.name` is required, there is no raw-symbol escape hatch. Add a missing meaning to the registry (both the `ios` SF name and the `android` material name); do not inline SF strings in screens. Menus that take an SF string use `ICON_GLYPHS.<name>.ios`.
- Registry names: `chevronRight chevronDown chevronUp close checkmark more external upvote comments reply share bookmark bookmarkFilled compose flag block safari refresh hide link favorite send time user userFilled karma calendar top new ask show jobs stories storiesFilled search settings settingsFilled login logout trash document code warning error success offline searchEmpty`. The five category names double as the category icons.
- Outline glyphs by default, filled variants only for state (bookmarked, selected tab).
- Inline icons (next to text) take their size from `INLINE_ICON_SIZE` (`caption 12`, `callout 14`, `body 16`) and the adjacent text's weight (`semibold` next to semibold counts). `Icon` defaults to `medium`.
- One glyph per meaning across app and widgets: points `arrow.up` (a vote is shown by colour, not a different glyph), comments `bubble.left`, block `person.slash`.

## Colour scheme

`ColorSchemeProvider` calls `Appearance.setColorScheme('unspecified')` for "System", otherwise the forced scheme, so native chrome follows in-app choice. `useTheme()` returns `{ scheme, colors }`. The provider also paints the root view (`SystemUI.setBackgroundColorAsync`) in the page colour and hides the splash once the saved preference is loaded; the splash background in `app.json` is the same `#F4F0EC` / `#17130F` as `background`.

## Haptics and motion

- `lib/haptics.ts`: `hapticSelection()` for rows, cards, segmented; `hapticImpact()` for buttons and committed actions; `hapticNotify()` for results. All are iOS-gated and swallow errors.
- Rows and cards go to `cardPressed`; cards scale to 0.98; buttons dim to 0.8.
- Skeletons pulse opacity 0.6 to 1 over 800ms and hold still under Reduce Motion.
- No entering/layout animations on list rows.

## Do / Don't

Do: use tokens via `useTheme`; use `Text` variants; use registry icons; give every rounded surface `borderCurve: "continuous"`; keep FlashList for long lists.

Don't: hardcode hex; put glass on content; put shadows or borders on cards; use `primary` for small text; use white on orange; add manual `useMemo`/`useCallback`/`React.memo` (React Compiler); add entering animations to list rows.

## Haptics reference (`lib/haptics.ts`)

Fire-and-forget, iOS-gated, errors swallowed; never await or wrap them. `hapticSelection()` for rows, filters, toggles; `hapticImpact(style?)` (default Light) for buttons and committed actions (vote, share, send); `hapticNotify(Haptics.NotificationFeedbackType.Success | Warning | Error)` for results. `Haptics` is re-exported from `expo-haptics` for the enum types.
