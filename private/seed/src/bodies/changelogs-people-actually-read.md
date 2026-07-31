Our changelog used to be generated from commit messages. It was accurate,
complete, published every week, and read by nobody. We have the analytics to
prove it: median time on the page was four seconds.

## A changelog is not a log

The mistake was in the name. A log records what happened to the code. A
changelog, the kind anyone reads voluntarily, records what changed for them.
Those are different documents, and only one of them can be generated.

Here is the same release in both voices:

> **Before:** fix(editor): debounce autosave to 400ms; refactor selection
> tracking; bump @tiptap/core to 3.28.0
>
> **After:** The editor no longer loses your place when a save lands
> mid-sentence.

The second one took someone four minutes to write. It is the only version
anyone remembers.

## What each entry needs

We hold entries to four things, in this order:

1. **The change, from outside.** What can you now do, or stop worrying about?
2. **Who it is for.** Not everything is for everyone; say so and let people
   skip.
3. **What to do, if anything.** Most entries need nothing. Say "nothing to do"
   rather than leaving the question open.
4. **A link,** if there is somewhere real to go.

Anything that cannot be written this way is a fix, and fixes go in a short
list at the bottom without ceremony.

## Writing it is part of shipping

The entry is written by whoever built the thing, in the pull request, before
review. This is not a process tax; it is the cheapest design review available.
Twice this year an entry proved impossible to write clearly and the feature
changed as a result.

## What we cut

- Version numbers in headings. Customers do not know which version they are on
  and should not have to.
- Dependency bumps. Nobody has ever wanted this, and pretending otherwise
  buried the things people did want.
- The word "improved" with no object.

## The numbers

Median time on the page is now 51 seconds and about a fifth of readers click
through to something. It is still the least glamorous page we maintain, and
it is now the one support links to most.
