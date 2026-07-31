We shipped on a Friday for a year. Not as a stunt, and not because we are
braver than anyone else: we did it because "no deploys on Friday" was quietly
costing us more than the incidents it prevented.

## What the rule was really doing

A deploy freeze does not remove risk. It moves it. Four days of merged,
unreleased work went out together on Monday morning, which meant every Monday
release was the largest of the week and the hardest to attribute when
something went wrong.

The freeze also taught us the wrong lesson about our own tooling. If Friday
is too dangerous to deploy, the honest reading is that _every_ day is too
dangerous and we have been getting away with it.

## What we changed first

We did not lift the rule and hope. We spent a quarter on the three things
that made Friday frightening:

- **Reversibility.** Every change either sits behind a flag or is safe to roll
  back with one command. Schema changes are split so the rollback never has to
  undo a migration.
- **Attribution.** One deploy, one change. If a graph moves, the release that
  moved it is unambiguous.
- **Ownership.** Whoever merges is the person who watches it land. Not the
  on-call engineer, not the team lead.

Only then did we try a Friday.

## The results, honestly

Over the year we had four incidents that a Friday freeze would have delayed
into Monday. All four were caught within twenty minutes and rolled back
before the weekend. In the same period, the size of the average release fell
by more than half, and our median time from merge to production went from
just over three days to under an hour.

The uncomfortable finding was that our worst incident of the year happened on
a Tuesday, at 11am, with three engineers watching.

## What we would keep if we started over

If you take one thing, take this: the rule to argue about is not which day
you deploy. It is whether you can undo a deploy without a meeting.

We still do not deploy on the Friday before a holiday weekend. Everyone
deserves a boring weekend occasionally, and that one is not a technical
decision.
