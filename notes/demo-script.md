# Demo script: WordPress agency, CEO

**Goal:** paid design partner. They pay, they go first, they shape the roadmap.
**Slot:** 40 minutes. 25 of demo, 15 of conversation.
**Running on:** local dev, `localhost:3000` (app) and `localhost:3001` (example site).

---

## Run sheet

| Time      | Beat                          | Where                                |
| --------- | ----------------------------- | ------------------------------------ |
| 0:00–0:03 | Two questions. Don't open the app. | —                               |
| 0:03–0:11 | Import their real site        | `/app/import`                        |
| 0:11–0:18 | Marketing owns the model      | `/app/c/posts`                       |
| 0:18–0:25 | Engineering gets a contract   | Editor + `localhost:3001`            |
| 0:25–0:32 | What they're paying others for | `/app/analytics`, assistant, webhooks |
| 0:32–0:40 | The ask                       | Laptop closed                        |

**The one line to land:** *"Your marketing team stops filing tickets, and your developers stop finding out from a reader."*

---

## Before you start

### The night before

```bash
vp install
```

```bash
pnpm --filter @repo/db seed
```

Start the app, then the example site, in separate terminals:

```bash
vp dev apps/web
```

```bash
vp dev examples/tanstack
```

Then backfill a month of traffic so `/app/analytics` isn't an empty state:

```bash
pnpm --filter @repo/analytics seed
```

Check `apps/web/.dev.vars` has a working `ANTHROPIC_API_KEY`. Without it the import wizard and the assistant both die, and they are two of your five acts. Also set `WEBHOOKS_BATCH_SECONDS=5` there — the default is 60, which is a long silence to fill on a call.

### Rehearse the import against their real site

This is the highest-variance part of the demo and the one you've chosen to do live. Run it end to end tonight, on their actual domain, and write down what happens:

- Does `discoverSite` find `sitemap.xml`? WordPress nearly always has one via Yoast or RankMath. If not it falls back to same-origin links on the entry page, which is noisier.
- Which path groups come back, and which ones extract cleanly? **Pick your two best groups and only include those on the call.** Blog posts are usually the strongest. Deselect the rest in the Scope step rather than discovering a bad extraction in front of them.
- Time the run. If it's slow, narrow the scope further.

Known limits, so nothing surprises you mid-demo:

- Images in imported bodies keep their original URLs. Their pictures will still be served from their WordPress host. Say so before they notice.
- Authors land as plain text, not people — imported authors have no member row.
- Only published, publicly reachable pages import.
- A retried run can duplicate entries. Don't re-run live if the first one looks odd; move on.

**Reset between the rehearsal and the demo** so you're importing into a clean org, otherwise you'll be importing on top of last night's entries.

### 30 minutes before

- Fresh browser profile. No bookmarks bar, no other tabs, no notifications.
- Zoom to 125%. A CEO is not going to lean in.
- Both dev servers up and warm — hit every route once so nothing compiles live.
- Terminal closed or on another desktop.
- Their site open in a tab, ready to compare side by side.

### On localhost

Don't apologise for it. Say it once, early, and make it the point:

> "This is running on my laptop. Nobody outside this room has used it yet. That's why I'm talking to you and not to a queue of customers."

For this ask, pre-launch is the offer, not the caveat.

---

## 0:00–0:03 — Two questions

Laptop closed. Get them describing their own problem in their own words, because you're going to demo those words back at them.

> "Before I show you anything — last time your marketing team wanted a new field on the site, something small, a byline or a badge on a case study. What actually happened?"

Let them answer fully. You are listening for: *a ticket, a developer, a wait, a deploy.* Whatever noun they use, use it for the rest of the demo.

> "And when a page goes out — how do you know if it worked?"

Listening for: *GA4, a spreadsheet, a monthly report, nobody looks.*

Then:

> "Right. I'm going to show you a system where the first thing takes forty seconds and doesn't involve a developer, and where the second thing is already on the page. Twenty-five minutes. Stop me whenever."

**Do not** open on `/app` — the home screen is a welcome message. Have `/app/import` already loaded.

---

## 0:03–0:11 — Act 1: their site, in Stet, live

Lead with this. Everything after it is more credible because they've already watched their own content arrive.

**Say:**

> "I haven't prepared this bit. This is your site, right now."

Paste their domain into the Site step. Talk while it scans:

> "It's reading your sitemap and grouping your URLs by section. It doesn't know anything about WordPress — it's just reading your site the way a reader does."

**Scope step.** Include only your two rehearsed groups. Narrate the deselecting as intent, not caution:

> "I'll take your posts and your case studies. We'd do the rest properly rather than by scraping."

**Model step.** This is the moment. It has proposed collections and fields from their actual pages.

> "Nobody wrote that. It read your site and worked out what your content model is. Those are your fields, with your names. Look at this one —" *(point at something specific from their site)*

**Preview step.** Show a real extracted entry against the live page in the other tab.

> "That's your post, on the left. Same words. The body's markdown now, not a pile of theme HTML and shortcodes."

**Run.** While it goes:

> "One thing to be straight about: your images are still being served from your WordPress host. The links point back at you. Copying the media across is on my list and it isn't done."

**If it goes wrong:** it will have gone wrong in rehearsal too, so you'll know which way. Don't debug in front of them. Say *"that section's server-rendered oddly, we'd handle that one differently"*, move to the group you know works, and carry on. If the whole thing falls over, go to the seeded `posts` collection and say *"I ran yours this morning, let me show you what came out"* — but only if you actually did.

---

## 0:11–0:18 — Act 2: marketing owns the model

Open the imported collection (or `/app/c/posts`).

> "This is the bit your marketing team lives in."

**Add a field, live.** Use the exact thing they described in question one — the byline, the badge, whatever noun they gave you.

> "You said a new field is a ticket. Watch."

Create the field, pick the type. Then edit values straight in the table cells.

> "That's it. It's on the site now — no deploy, nobody asked, no sprint."

**Then the open-in-place editor.** Show the body editing, the presence cursors if you can get a second window up.

> "Two people, same entry, same time. That's live, not a lock."

**Show revision history** on the entry (`history` on the entry page).

> "Every change is snapshotted, and you can put it back."

**Do not** promise drafts, scheduled publishing, or approval workflow. Stet is deliberately live-only. If they ask — and a marketing firm will:

> "There's no draft/publish toggle, on purpose. Publishing states are different at every company I've looked at, and a fixed one is always wrong for somebody. You model it — a status field and a branch in your site code — and it works exactly the way your team works. If that's a dealbreaker for you, that's a genuinely useful thing for me to know today."

That's honest, it's the actual design decision, and for a design-partner ask their objection is *worth more to you than the sale*.

---

## 0:18–0:25 — Act 3: engineering gets a contract

Switch to the editor with `examples/tanstack` open. This is the half WPGraphQL half-does, and it's where a bespoke-site owner feels the difference.

> "Your site talks to WordPress over GraphQL. Someone set that up, and someone maintains the codegen. Here's the same job."

Show `stet.gen.ts`. Then type in a route file and let autocomplete fire:

```ts
const posts = await stet.posts.list();
```

> "That autocompletes because the model exists. Not because someone wrote a schema file and remembered to regenerate."

**The payoff.** Go back to Stet, add another field, come back to the editor. The dev server's watcher regenerates within seconds.

> "I added that field thirty seconds ago in the other window. Your developer didn't do anything. It's just there."

**Now the change story — and be precise here, because this is where a technical person will test you.**

> "Here's what happens when marketing deletes a field. In your setup today, nothing warns anyone. The query keeps working, the page renders an empty div, and you find out because a reader tells you — or you never find out.
>
> Here, the field leaves the generated types, so your developer gets a type error in their editor the moment they next pull. And the generation step can never fail your build: if it can't reach Stet, it keeps the last file and warns. So the worst case is your site builds and ships exactly as it did yesterday."

**Do not say "it becomes a deprecation and keeps serving the last value."** See the honesty section below.

---

## 0:25–0:32 — Act 4: the things they're paying someone else for

Move fast. Three things, two minutes each.

**Analytics** — `/app/analytics`, a month of traffic already there.

> "First-party, cookieless, routed through your own backend. No consent banner, because there's no cookie and no third party. Ad blockers don't touch it because it's your domain." *(Then, if they run GA4 — and they do:)* "How much of your traffic do you think GA4 is currently missing?"

**The assistant** — open the panel, ask it to do something real to their imported content.

> "Ask it to retitle these three posts for search."

When the approval card appears — **stop and point at it**:

> "That's the important bit. It won't write anything without that. It's not a chatbot next to your content, it's got the same tools I have, and every write stops here."

Mention MCP in one line only if their technical person is in the room: *"same tools are an MCP server, so Claude or Cursor can edit content directly."*

**Webhooks** — `/app/developers/webhooks`.

> "Content changes fire one batched event, not one per keystroke, so your site rebuilds once when an editor finishes rather than forty times while they're typing."

---

## 0:32–0:40 — The ask

Close the laptop. This matters — it changes the register.

### Handle the money before they raise it

They pay £288 a year. Say the number first, out loud, before they can use it as a weapon:

> "You pay two hundred and eighty-eight pounds a year today. I'm not going to pretend I can beat that, so let's be honest about what that number is.
>
> That's your hosting. It isn't your cost. Your cost is the developer time between your marketing team wanting something and it being on the site. One field, one ticket, one deploy — what does that cost you? A day of someone's time? Two? At your rates that's the WordPress bill for a year, twice over, on a single field.
>
> My list price is ten dollars per user per month. For a marketing team of three that's about what you're paying now. For five it's more. If the only thing this does is remove two developer days a year, it's paid for itself and you've got the analytics and the AI for free."

Adjust the arithmetic to their actual headcount and day rate. If you know their rate, use it — the number lands harder than the ratio.

### The offer

> "Here's what I actually want.
>
> Stet isn't launched. You'd be the first real site on it. That's a real risk and I'm not going to dress it up — things will break, and you'll be the one finding them.
>
> So: I do the migration. Your site, off WordPress, onto this, built properly rather than scraped. You pay me for that work, because it's work and I'll do it properly. And you get the platform at [X] for [term], locked, plus my phone number.
>
> What I want back is that you actually use it, and you tell me every time it annoys you. You're a marketing firm — your marketing people are exactly the users I'm building for, and I don't have any. That's worth more to me right now than the licence fee."

### The second prize — raise it if the room is warm

This is a marketing firm. They build sites for clients. That's a channel, not a seat.

> "And there's a version of this that's bigger than your own site. Every client site you build, you hand over, and then you spend the next two years fielding 'can you add a field for us'. If the client can add it themselves and it can't break what you shipped, that's your support queue gone — and it's a thing you can sell.
>
> I'm not pitching that today. But if your own site goes well, I'd want to talk about it."

### Close

> "What's the honest reaction?"

Then stop talking.

---

## What NOT to claim

Read this section before you walk in. The marketing site and README describe the product Stet is becoming; some of it isn't built, and their setup is precisely the one the biggest claim is about. If their developer or contractor pokes at it afterwards and finds the gap, you lose the room retrospectively — and for a design-partner relationship, credibility *is* the product.

**Deprecations — not implemented.** The site says a removed field "becomes a deprecation in the generated types and keeps serving its last value" and "the build stays green". Neither half is true today:

- `renderContentModule` in [codegen.ts](published/client/src/codegen.ts) emits only currently-present fields. There is no `@deprecated` anywhere in the codegen.
- `deleteField` in [fields.ts:195](private/content/src/fields.ts:195) drops the field row, and stale keys in entry values are dropped on read. The last value is not served.

What *is* true, and is enough: sync can never fail their build ([vite plugin](published/vite/README.md:51) keeps the last generated file and warns), and a removed field surfaces as a type error in the developer's editor rather than as a blank region on a live page. Use the Act 3 wording above — it's strictly better than their WPGraphQL setup and it's accurate.

**Comments — not built.** README and the marketing site promise realtime comments on content. There's no comment table in the schema and no UI. Don't open the collaboration story with it. Presence and co-editing *are* real; demo those.

**Drafts, scheduled publishing — deliberately absent.** Covered above. Never imply they exist.

**Localisation — not built.** The app is English-only and the per-locale shape is undecided. If they have multilingual clients, say it's not there and you'd want to design it with them. That's a good design-partner conversation, not a weakness to hide.

**Image migration — not built.** Imported bodies keep original URLs. Disclose during the run.

**One safe sentence for all of it:** *"That's on the roadmap and it isn't built. If it matters to you, it moves up — that's the whole point of you going first."*

---

## Objections

**"You're pre-launch. What if you get bored?"**
Fair, and the honest answer is the licence. It's open source and it self-hosts — worst case they run it themselves and keep the site. Don't oversell your own persistence; sell their exit.

**"We'd be locked in."**
Content is markdown out of a REST API. The client is a thin wrapper. Compare that to getting content out of WordPress with ACF fields and shortcodes — which they've just watched you do, badly, in the import step. That comparison is yours to make.

**"Our WordPress works fine."**
Agree with it. *"It does. I wouldn't move you off it to save £288."* Then go back to their answer to question one. The case is the wait, not the software.

**"Who else uses it?"**
*"Nobody. That's the offer."* Don't invent traction. A CEO can smell it, and it's the one lie that would actually cost you this deal.

**"Can our clients use it?"**
Yes, and that's the interesting conversation — but only after their own site works. Don't let the demo become about a channel deal before you have a single live site.

**"What about SEO / redirects / the stuff WordPress plugins do?"**
Stet manages content; building and serving the site is theirs. They already have a bespoke site, so their developer owns this today and will continue to. Don't get pulled into rebuilding Yoast.

---

## If it all breaks

You're on localhost in front of a CEO. Have these ready:

1. **Import fails** → fall back to the seeded collection, keep moving. Never debug live.
2. **AI doesn't respond** → `ANTHROPIC_API_KEY`. Skip the act, don't investigate. *"That one needs the internet more than I do."*
3. **Dev server dies** → both servers restart in seconds; keep talking through it. The two questions from Act 1 are enough material to fill sixty seconds.
4. **Total loss** → close the laptop and do the ask anyway. You had them at their own content in Act 1; the rest is supporting evidence. A CEO buys the person more often than the software, and this ask is mostly about the person.
