Edge caching is the rare optimisation that is both enormous and free, right
up until it serves one customer another customer's data. Everything below is
about staying on the right side of that line.

## Cache the boring things first

Most of the win is in responses nobody would think to protect: fonts, the
compiled stylesheet, the marketing pages, the public API's schema document.
They are identical for everyone, they change on deploy, and they are a
one-line header away from never touching an origin again.

We got 78% of our origin traffic reduction from those alone, before touching
anything with a session on it.

## The rule for anything personal

A response that varies by who is asking is cacheable only if the thing it
varies on is in the cache key. In practice that means we never cache on
`Cookie`, because a cookie header contains everything and changes constantly.
Instead the edge reads the session once, and the key carries the small,
explicit facts the response actually depends on.

If a response depends on something we cannot name, it is not cached. There is
no third option, and no header combination that makes it safe.

## Invalidate on write, not on a timer

Time-based expiry is a guess about how stale is acceptable. We would rather
be exact:

- Content writes publish an invalidation for the paths that changed.
- The invalidation is part of the write path, so a failed purge fails the
  write rather than silently leaving a stale page up.
- Anything we cannot enumerate the paths for gets a short expiry and an
  honest note in the code about why.

The middle point is where most implementations quietly cheat.

## Watch the ratio, not the latency

Latency graphs improve the moment you cache anything, which makes them a poor
signal. The number that told us something was the hit ratio _by route_: two
routes at 12% turned out to be setting a `Vary` header nobody remembered
adding, and the ratio found it in a minute where the latency graph had shown
a healthy average for a year.

## What it cost

One incident, in staging, when a preview response was cached under a key that
omitted the draft flag. It never reached production because the check that
caught it is a test that asks, for every cached route, "name everything in
the key". That test is now the first thing we write when adding a route.
