This is the whole checklist. It fits on one screen on purpose: a checklist
nobody finishes is a checklist nobody starts.

## Before you open it

- The description says what changes for a customer, in one sentence.
- The diff is one idea. Two ideas are two pull requests.
- Anything you would explain in a review comment is a code comment or a commit
  message instead.

The one-idea rule does more work than the rest of the list combined. Reviews
of a focused diff come back in under an hour; reviews of a mixed one come
back in a day and miss things.

## While reviewing

Read in this order, and stop at the first level that has a problem:

1. **Does it belong?** The best review outcome is a smaller change, or none.
2. **Is it correct at the edges?** Empty, one, many, concurrent, and failed.
3. **Will the next person understand it?** Not "is it clever" — clever is a
   cost we pay in maintenance.
4. **Style.** Last, and only where the formatter has no opinion.

Most review disagreements we have had were two people arguing at different
levels of that list without noticing.

## What we do not do

We do not require two approvals. We tried it for a quarter; the second
reviewer approved without reading in about half of the samples we checked,
which is worse than one honest approval because everyone thinks it was read
twice.

We do not block on test coverage percentages. We block on "is the risky path
tested", which a number cannot tell you.

## Comments have a grammar

Every comment says which kind it is, because "have you considered" reads as
optional to one person and mandatory to another:

- **blocking:** this must change before merge.
- **suggestion:** I would do it differently; your call.
- **question:** I do not understand this yet.
- **praise:** exactly what it says. Use it more than you think.

## After merge

The author watches it reach production and says so in the channel. That is
the last item, and it is the one that keeps the rest honest.
