Every screen we build has a first run, and for a while ours all looked the
same: a heading, a thin grey border, and the words "No items yet." It was
honest. It was also the least useful moment in the whole product, and it was
the one every new customer saw first.

## An empty screen is still a screen

We started treating the empty state as a real piece of design work rather
than a fallback. The rule we settled on is that an empty screen has three
jobs:

1. Say what belongs here, in the customer's words rather than ours.
2. Show what it will look like once it is full.
3. Offer exactly one way to fill it.

Three jobs, in that order. The third one is the easiest to get wrong: a row
of four buttons is not a call to action, it is a decision we pushed onto
someone who has been here for eleven seconds.

## Show the shape of the thing

The change that moved the numbers most was the second job. Instead of
describing what a filled screen would contain, we render a faded example of
it, with plausible values in every column.

> People do not read a description of a table. They read a table.

It costs a little: the placeholder has to be maintained alongside the real
component, and a stale placeholder is worse than none. We keep them honest by
building the preview from the same component as the live view, fed with
static data.

## What we removed

Two things went away entirely.

- The illustration. It was charming, it took up 300 vertical pixels, and in
  testing nobody could tell us what it meant.
- The link to the documentation. Anyone reaching for docs on an empty screen
  is telling us the screen failed.

## Where we landed

The empty state now reads as a promise about what the screen becomes, not an
apology for what it currently is. Activation on the collections screen moved
from 41% to 63% over six weeks, and support threads that begin "what am I
meant to do here" dropped to almost none.

The next one to fix is the empty state after a search returns nothing, which
is a different problem wearing the same clothes.
