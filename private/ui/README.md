# @repo/ui

Shared UI: shadcn/ui components built on Base UI (the shadcn default) with Tailwind v4.

- `./components/*`: the component library. Add components by copying from the shadcn `base` registry variant.
- `./globals.css`: the theme, design tokens, and Tailwind setup. Import once per app.
- `./hooks/*` and `./lib/*`: shared hooks and utilities.

The default typeface is Geist via Fontsource.

Components that bake in a screen-reader string with no natural prop (the
sidebar's trigger, rail, and mobile sheet header) call
[@repo/i18n](../i18n)'s `m.*()` directly. Message functions resolve against
the ambient locale on call, so there is no provider to wire up and the
component signatures stay as shadcn ships them. Copy such a component into a
project without `@repo/i18n` and you will need to swap those calls back to
literals.
