# Stet

**Both teams at full speed. Neither waits, nothing breaks.**

Every CMS makes one side compromise. Developer-first tools bury content teams in JSON and Git. Marketer-first tools hand developers an untyped API and a prayer. Stet refuses the trade-off.

## Benefits

The gap between marketing and engineering is Stet's whole job. Every benefit comes from closing it:

- **Marketing owns the model.** New collections, maps, and fields without a ticket or a wait.
- **Engineering gets a contract.** The generated client autocompletes the model marketing built and checks it at build time.
- **Nothing breaks across the gap.** Changes cross it as information, never as breakage: a deleted field becomes a deprecation in the client, not a failed build or a broken page, and each team migrates on its own schedule.
- **One shared workspace.** Writing, comments, reviews, and performance numbers live on the content itself instead of being spread across four tools.
- **Analytics included.** First-party, cookieless, and routed through your own infrastructure. No consent banner, no blocked pixel, no data silo.
- **AI that does the work.** Drafting, editorial suggestions, translations, and whole delegated tasks, in the same realtime session as the humans.
- **Yours to run.** Open source, as a hosted cloud or self-hosted on your own infrastructure.

## Features

### For content teams

- Model your content in the UI, the way you think about it: collections and maps, with fields, bodies, and validation rules, as intuitive as Notion.
- Realtime collaboration: write together with live cursors, and discuss in realtime comments on any piece of content.
- Drafts, scheduled publishing, version history, and rollback: publish when it is ready, and undo it when it is not.
- Localized content built in: per-locale entries, translation status, and AI translation into every locale you serve.
- Roles and publish permissions per collection, so the right people review before anything ships.
- AI everywhere you work: draft and rewrite copy, get editorial suggestions you accept or reject, or delegate a whole task to an agent in the session.
- Analytics next to the content: see how every page performs, annotated with the context that explains why. Cookieless and privacy-first, so there is no consent banner between you and your readers.
- A fast, beautiful editor you actually want to write in.

### For engineers

The content model marketing designs becomes an API your editor autocompletes.

```ts
import { stet } from "@stet/client";

const posts = await stet.posts.list(); // a collection
const post = await stet.posts.get("hello-world"); // one entry
const landing = await stet.landing.get(); // a map
// all fully typed from the model marketing built
```

- A Vite plugin that generates a typed client from your project's content model and keeps it current as the model evolves.
- Drafts and published entries are separate, typed views, so previews are yours to build in your own app with the same client.
- A REST API, SDKs, and drop-in components when you want them.
- A CLI for scripting, seeding, and CI.
- Content served through the client reports its own performance, so every entry has analytics from the moment its page exists, with no instrumentation written.
- Type-safe analytics events, routed through your own infrastructure: cookieless, enriched server-side, immune to ad-blockers, and compliant by design. Marketing builds dashboards on the same events in the UI.
- Webhooks on content events to trigger rebuilds and syncs.

## Principles

These hold everywhere, in the product and in this codebase:

- Stet owns no customer-facing UI. Rendering, previews, and draft views are built by developers in their own app with the client. Never pitch or build hosted previews.
- Not a page builder, and not a host. Stet manages content; building and serving the site is the developer's job.
- The experience is the product: superhuman UX for editors, fluent DX for engineers. If either feels ordinary, it is not done.
- Never break the customer's build or runtime. Sync cannot fail a build, tracking never throws, and schema changes surface as deprecations, never as errors.
- Analytics routes through the customer's infrastructure. Content delivery does not; it is served through Stet's API and clients.
- The server is the trusted side. Server-provided context wins over anything the browser sends.
- The platform learns the schema from sync, not by inferring it from incoming data.
- Calm by default: light, spacious, unhurried, in both the UI and the brand.

## Open questions

Decisions not yet made. Do not assume a shape for these in code or copy:

- Localization: per-locale entries is the goal, but the shape (in the model, the UI, and the client API) is undecided.
- Entry bodies: probably markdown, and not always exactly one per entry (a post might carry two bodies, a map might carry none). Shape undecided.
- Pricing: current thinking is simple $10/user on the cloud version. Not committed.
- License: "open source" is the intent; the repo still carries the Onyx FSL license.

## Development

```bash
vp install
vp run dev   # http://localhost:3000
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and [DEPLOY.md](DEPLOY.md) for shipping to Cloudflare.
