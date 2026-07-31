A cold start is the most expensive request a customer will ever make, and it
is almost always their first one. That asymmetry is what makes it worth
measuring properly rather than averaging away.

## Averages hide it completely

Our p50 response time was 34ms and had been for months. Our p99 was 890ms. The
p99 was not a slow query: it was the first request to reach an instance that
had just started, doing in one request all the work every later request would
inherit for free.

Averaged across a busy day, cold starts are a rounding error. Measured
per-customer, they are the whole experience of trying the product.

## Where the time actually went

We instrumented startup rather than guessing. On a typical cold path:

| Phase                         | Time  |
| ----------------------------- | ----- |
| Module evaluation             | 210ms |
| Config parsing and validation | 95ms  |
| First database connection     | 140ms |
| Everything else               | 45ms  |

Module evaluation being the largest was the surprise. We were importing the
entire markdown pipeline at the top of a module that only needed it on one
route.

## Three fixes, in order of value

1. **Move work behind the route that needs it.** Dynamic imports on the three
   heaviest paths cut module evaluation by two thirds. This was an afternoon.
2. **Validate config once, at build time.** The schema still exists; it runs in
   CI instead of on every start.
3. **Open the connection lazily.** Most requests to a fresh instance never
   touch the database at all.

## What we did not do

We did not add a warmer. Pinging an endpoint on a timer to keep instances
alive is paying for capacity to hide a startup cost, and it fails exactly
when traffic grows past the number of instances you thought to warm.

We also stopped short of caching the parsed config to disk. It would have
saved 30ms and added a cache invalidation problem, which is a bad trade at
any price.

## The number now

p99 is 210ms and the cold path is 190ms of it. There is another 60ms
available in module evaluation whenever we want it, and after that the
remaining time is the platform's, not ours.
