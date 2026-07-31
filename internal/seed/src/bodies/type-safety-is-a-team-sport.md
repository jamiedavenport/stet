Types stop being useful at the exact point where they stop being shared. A
strictly typed module that hands a `Record<string, unknown>` to the next
module has moved the problem, not solved it.

## The boundary is the interesting part

Inside a module, types are cheap and nobody argues about them. The value is
at the seams: the HTTP handler, the queue message, the row that came back
from the database, the config file someone edits by hand.

Our rule is that every boundary parses rather than asserts.

```ts
// Asserting: the compiler believes you, the runtime does not care.
const body = (await request.json()) as CreatePost;

// Parsing: one place where wrong data becomes a readable failure.
const body = createPost.parse(await request.json());
```

The second version is three characters longer and is the difference between
a bug reported as "title is undefined in the email template" and one reported
as "title is required".

## Generate what you can

The types nobody maintains are the ones that stay correct. Anything with a
schema on the other side of it — the database, the API, the content model —
gets a generated client, checked into the repository so a build never depends
on a service being reachable.

The generated file is boring on purpose:

- It is regenerated, never edited.
- It is committed, so review sees the diff when the shape changes.
- It fails the type check, not the page, when a field goes away.

That last point matters more than it sounds. A field removed upstream should
surface as a red squiggle on the branch that removes it, not as an empty
paragraph on a customer's page three weeks later.

## Make the wrong thing hard to write

The best types we have are the ones that made a whole category of mistake
unrepresentable:

- Ids are branded, so an organization id cannot be passed where a user id
  belongs.
- Money is a single integer type in minor units; there is no float anywhere
  near it.
- Anything that can be absent is a union with `null`, never an optional
  property. Two ways to say "missing" is one too many.

## What we stopped doing

We stopped chasing `any`. A codebase with twelve deliberate, commented
escapes is healthier than one with zero and a `tsconfig` full of exemptions.
The goal was never the score.
