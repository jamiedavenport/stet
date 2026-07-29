import {
  CalendarDotsIcon,
  ChartBarIcon,
  TranslateIcon,
  PenNibIcon,
  ShapesIcon,
  ShieldCheckIcon,
  SparkleIcon,
  UsersIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

// Marketing copy and data: edit here (and @repo/brand) to re-pitch without
// touching layout.

export type Feature = { icon: Icon; name: string; description: string };

/** What the editor side of the product does, for the landing page grid. */
export const contentFeatures: Feature[] = [
  {
    icon: ShapesIcon,
    name: 'Model it in the UI',
    description:
      'Collections and maps with fields, bodies, and validation, designed the way you think about content. No ticket, no wait.',
  },
  {
    icon: UsersIcon,
    name: 'Write together',
    description:
      'Realtime collaboration with live cursors, and comments that live on the content itself.',
  },
  {
    icon: CalendarDotsIcon,
    name: 'Publish with confidence',
    description:
      'Drafts, scheduled publishing, version history, and rollback. Publish when it is ready, undo it when it is not.',
  },
  {
    icon: TranslateIcon,
    name: 'Every locale you serve',
    description:
      'Localized content built in: per-locale entries, translation status, and AI translation.',
  },
  {
    icon: ShieldCheckIcon,
    name: 'The right reviewers',
    description:
      'Roles and publish permissions per collection, so the right people sign off before anything ships.',
  },
  {
    icon: SparkleIcon,
    name: 'AI that does the work',
    description:
      'Draft and rewrite copy, take editorial suggestions, or delegate a whole task to an agent in the session.',
  },
  {
    icon: ChartBarIcon,
    name: 'Analytics next to the content',
    description:
      'See how every page performs, annotated with the context that explains why. Cookieless, with no consent banner.',
  },
  {
    icon: PenNibIcon,
    name: 'An editor you want to write in',
    description: 'Fast, calm, and beautiful, in a workspace shared by the whole team.',
  },
];

/** What the developer side of the product does, for the landing page rows. */
export const engineerPoints = [
  {
    term: 'A client generated from the model',
    detail:
      "The Vite plugin generates a typed client from your project's content model and keeps it current as the model evolves.",
  },
  {
    term: 'Deprecations, never breakage',
    detail:
      'A deleted field becomes a deprecation in the client, not a failed build or a broken page. Each team migrates on its own schedule.',
  },
  {
    term: 'Previews are yours to build',
    detail:
      'Drafts and published entries are separate, typed views, served to your own app through the same client.',
  },
  {
    term: 'REST API, SDKs, and a CLI',
    detail:
      'A REST API and drop-in components when you want them, and a CLI for scripting, seeding, and CI.',
  },
  {
    term: 'Analytics with no instrumentation',
    detail:
      'Content served through the client reports its own performance, and typed events route through your own infrastructure, immune to ad blockers.',
  },
  {
    term: 'Webhooks on content events',
    detail: 'Trigger rebuilds and syncs the moment content changes.',
  },
];
