# ASO review: Hacker Reader 1.4.0 (2026-09-30)

Pulled from App Store Connect with `asc` (app 6754137305, en-US only). Scored with the
`aso` skill (coreyhaines31/marketingskills) as a **Challenger** app: under 100K ratings,
so it needs keyword discovery.

## Score: 60 / 100 (C)

| Dimension            | Weight | Score | Why                                                                                  |
| -------------------- | ------ | ----- | ------------------------------------------------------------------------------------ |
| Title & Subtitle     | 20%    | 5     | Subtitle spends 16 of 30 chars on "like it deserves", which no one searches for      |
| Description          | 15%    | 8     | Clear opening, scannable sections. Not indexed on iOS, so it only affects conversion |
| Visual assets        | 25%    | 8     | 7 captioned screenshots and a strong first 3. No preview video                       |
| Ratings & reviews    | 20%    | 2     | 5 ratings in total. **US: one 1★ rating**, BR 5.0 (3), HR 1.0 (1). No in-app prompt  |
| Metadata & freshness | 10%    | 6     | Updated today. en-US only. News primary; Business secondary is a weak fit            |
| Conversion signals   | 10%    | 8     | Free, no IAP, open source, privacy story                                             |

## The biggest problem: ratings

US visitors see **1.0 ★ (1 rating)**. The app never asks for a rating, so a single unhappy
user sets the US score. This drags down conversion and ranking more than any copy change.

**Fixed on branch `chore/aso-review-prompt`:** the app now asks for a rating through
`expo-store-review` (`lib/store-review/`). It asks only when all of these hold:

- the user has read at least 10 stories, and first opened one at least 3 days ago
- the app has not asked on this version before, and has not asked in the last 120 days
- the user is leaving a story (never in the middle of reading one)

iOS also limits the system prompt to three times a year. This ships with the next build.

## Keywords: staged for the next version (`1.4.1/metadata/`)

Subtitle and keywords are locked while 1.4.0 is the live version. They change with the
next version.

**Subtitle** (28/30 chars)

- current: `Hacker News like it deserves`
- proposed: `Hacker News Client & Widgets`

This keeps the exact phrase "Hacker News", adds "client" (people search for "hacker news
client"), and adds "widgets", which set 1.4.0 apart from other apps.

**Keywords** (100/100 bytes, no word repeated from the title or subtitle)

- current, 93 bytes:
  `HN,Show HN,Ask HN,hackernews,YC,Y Combinator,tech,startup,programming,developer,coding,widget`
- proposed:
  `hn,hackernews,ycombinator,yc,tech,startup,programming,developer,coding,software,ask,show,founder,dev`

The current field has these problems:

- "HN" appears 3 times. Apple indexes each word once, and spaces waste bytes.
- "widget" moves to the subtitle.
- "Y Combinator" becomes `ycombinator`, one word that saves bytes.
- The freed bytes add `software`, `founder` and `dev`.

We can't see search volume without a paid tool (Appfigures, AppTweak, Astro). Check these
choices against real data if you have it.

## Other recommendations (not applied)

1. **First screenshot caption**: change "A calm, native HN reader" to "A calm, native Hacker
   News reader". Apple has indexed caption text since 2025, and most people search "hacker
   news", not "HN". Re-render with `source/render.py`.
2. **Reply to the 2 reviews** (both 5★, Brazil, from Nov 2025). Replies are public, so they
   should be written by you.
3. **Preview video**: a 15–20 s clip (scroll the feed, open a story, collapse a thread, show
   the widget) autoplays muted in search results. The skill's benchmarks put the gain at
   20–40% more conversions.
4. **Secondary category**: switch Business to Developer Tools or Productivity, where it fits
   better and has less competition. The effect on ranking is small, and it changes with the
   next version.
5. **Localization**: the app has no pt-BR listing, but Brazil has 3 of its 5 ratings. A
   pt-BR subtitle, keywords and captions cost little. Extra locales also add keyword slots
   in the US storefront, for example English (UK) and Spanish (Mexico).
6. **Promotional text** (can change any time, not indexed): the current text is fine. Use it
   for timely announcements.

## Security note

`1.4.0/metadata/reviewNotes.txt` contains the real App Review demo password, and this repo
is public. Anyone can sign in as `appstorereview` and post on HN. Change the password on
HN, update it in ASC review details, and remove it from the file.
