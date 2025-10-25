You’re right: the official Hacker News API (Firebase) is read-only—no login, votes, comments, or favorites there.  ￼

Here’s a battle-tested way iOS apps do it:

The approach (works today)
	1.	Use the read-only API for data. Items, users, updates, etc. (fast + stable).  ￼
	2.	Do “write” actions by mirroring HN’s real web forms/links with the user’s own session cookies:
	•	Login: POST to https://news.ycombinator.com/login with acct, pw, goto fields; server sets a session cookie.  ￼
	•	Upvote / unvote / flag / hide / favorite: first GET the item page, parse the action link (it includes a per-item auth token), then hit that link (GET).  ￼
	•	Comment / reply: GET the item or comment page, parse the form[action="comment"] and submit the form exactly as provided (includes hidden inputs). (Same idea: mirror the form.)  ￼

This isn’t an “API”—you’re acting like a real browser—so it keeps working as long as you:
	•	send the right form fields/links,
	•	include the user’s cookies,
	•	and respect rate limits.

HN has explicitly no public write API; lots of clients implement writes by reverse-engineering forms and the vote link with its auth param.  ￼

⸻

iOS / React Native implementation plan

0) Libraries
	•	React Native WebView to show the official HN login page.
	•	Cookie management: react-native-cookies or expo-cookie (Expo) to read/write cookies for news.ycombinator.com.
	•	Secure storage: expo-secure-store (or Keychain) to persist cookies safely.
	•	HTML parsing: cheerio (runs fine in RN) to extract href and form fields from HN pages.

1) Login (don’t handle passwords yourself)
	•	Open a WebView at https://news.ycombinator.com/login.
	•	After successful login (WebView navigates to /news or similar), read cookies for https://news.ycombinator.com from the shared cookie store and save them in SecureStore.
	•	In your API module, attach these cookies to all subsequent fetch calls to news.ycombinator.com (set the Cookie header manually, since RN’s fetch doesn’t always persist cookies across requests).

Reference for fields you’d POST if you ever build a native form: acct, pw, goto. But IMO: keep the real HN login UI inside a WebView to avoid ever touching credentials.  ￼

2) Upvote / Unvote (same pattern for flag/hide/fave)

async function vote(itemId: number, cookies: string) {
  // 1) fetch item page
  const html = await fetch(`https://news.ycombinator.com/item?id=${itemId}`, {
    headers: { Cookie: cookies },
  }).then(r => r.text());

  // 2) parse the per-item action url (contains `auth` token)
  const $ = cheerio.load(html);
  const href = $(`#up_${itemId}`).attr('href'); // or #un_${itemId} for unvote
  if (!href) throw new Error('No vote link found (maybe already upvoted?)');

  // 3) hit the link
  await fetch(`https://news.ycombinator.com/${href}`, {
    headers: { Cookie: cookies },
  });
}

HN’s vote link looks like:
/vote?id=<itemId>&how=up&auth=<token>&goto=news—that auth is per-user and per-item, so you must fetch each page to get it.  ￼

Notes:
	•	Favorite / hide / flag links work the same way and often share the same auth token visible on the page.  ￼
	•	To confirm success, re-fetch the item page and check if the upvote arrow disappeared or points increased.

3) Comment / reply

async function comment(parentId: number, text: string, cookies: string) {
  // 1) fetch the parent page
  const html = await fetch(`https://news.ycombinator.com/item?id=${parentId}`, {
    headers: { Cookie: cookies },
  }).then(r => r.text());

  // 2) grab the form + hidden inputs exactly as-is
  const $ = cheerio.load(html);
  const form = $('form[action="comment"]');
  if (!form.length) throw new Error('No comment form (not logged, no email, or rate limited)');

  const inputs: Record<string,string> = {};
  form.find('input, textarea').each((_, el) => {
    const name = $(el).attr('name');
    if (!name) return;
    inputs[name] = name === 'text' ? text : ($(el).attr('value') ?? '');
  });

  // 3) submit URL-encoded form
  const body = new URLSearchParams(inputs as any).toString();
  await fetch('https://news.ycombinator.com/comment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies,
    },
    body,
  });
}

Why this works: you’re not guessing parameters—you’re submitting the form the page gave you, including hidden fields (which may include a CSRF-style token).  ￼

⸻

UX + product details
	•	Single “Sign in with Hacker News” button → opens WebView to the real login page. After success, close WebView and you’re signed in.
	•	Session handling: cookies can live a long time—persist them in Keychain and refresh if requests start coming back as anonymous.
	•	Respect user permissions: some actions (e.g., downvotes) are karma-gated on HN, so your UI should hide or disable actions the page doesn’t offer. (If there’s no link/form, don’t show the button.)  ￼
	•	Rate limiting & courtesy: cache item pages briefly to avoid refetching per action; back off on 429s; mirror HN’s pacing.
	•	Security: never proxy or store passwords on your servers. Use only first-party cookies from news.ycombinator.com stored locally.

⸻

Why this is “allowed in practice”

There’s no official write API. Many clients implement writes by submitting the same forms/links the website uses (with the user’s real session). This technique (inspect page → submit the exact request) is well-documented, including the per-item auth token used in vote links.  ￼

Also worth noting: years ago HN hinted they might add OAuth for per-user data “later,” but that never materialized—so this is still the standard path for native clients.  ￼

⸻

If you want, I can drop in a tiny RN module (useHNCookies, hnVote, hnComment) wired for Expo (SecureStore + WebView + cheerio), so you can paste it into your app and ship.