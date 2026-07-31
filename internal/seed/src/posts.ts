import fs from 'node:fs';
import path from 'node:path';

import { seedAuthors } from '@repo/db/seed-data';

import { covers } from './assets';
import { tags, topics } from './model';

// The demo blog: ten posts spread over the last few months, each with a body
// written in ./bodies. Dates are relative to the run so a workspace seeded
// today reads as one that has been in use, whenever today is.

const [nadia, tomas, priya] = seedAuthors;

export type SeedPost = {
  slug: string;
  title: string;
  summary: string;
  authorId: string;
  topicId: string;
  tagIds: string[];
  coverId: string;
  featured: boolean;
  /** Slugs of other posts, resolved to entry ids when the entries are written. */
  related: string[];
  /** How long ago it was published, and so when its entry was created. */
  daysAgo: number;
};

export const posts: SeedPost[] = [
  {
    slug: 'designing-the-empty-state',
    title: 'Designing the empty state',
    summary: 'The screen every new customer sees first deserves more than "No items yet".',
    authorId: nadia.id,
    topicId: topics.design.id,
    tagIds: [tags.craft.id, tags.onboarding.id],
    coverId: covers.design.id,
    featured: false,
    related: ['seven-minutes-to-the-first-win'],
    daysAgo: 132,
  },
  {
    slug: 'a-style-guide-for-error-messages',
    title: 'A style guide for error messages',
    summary: 'We audited 412 error strings. Here is the guide we wrote afterwards.',
    authorId: nadia.id,
    topicId: topics.writing.id,
    tagIds: [tags.craft.id],
    coverId: covers.writing.id,
    featured: false,
    related: ['changelogs-people-actually-read'],
    daysAgo: 118,
  },
  {
    slug: 'what-we-learned-shipping-on-fridays',
    title: 'What we learned shipping on Fridays',
    summary: 'A year without a deploy freeze, and the three things we fixed before trying it.',
    authorId: priya.id,
    topicId: topics.process.id,
    tagIds: [tags.releases.id, tags.measurement.id],
    coverId: covers.process.id,
    featured: false,
    related: ['our-pull-request-checklist'],
    daysAgo: 96,
  },
  {
    slug: 'type-safety-is-a-team-sport',
    title: 'Type safety is a team sport',
    summary: 'Types stop being useful where they stop being shared. The seams are the work.',
    authorId: tomas.id,
    topicId: topics.engineering.id,
    tagIds: [tags.craft.id, tags.testing.id],
    coverId: covers.engineering.id,
    featured: false,
    related: ['our-pull-request-checklist'],
    daysAgo: 84,
  },
  {
    slug: 'the-cost-of-a-cold-start',
    title: 'The cost of a cold start',
    summary: 'Our p50 said nothing was wrong. Our first request said otherwise.',
    authorId: tomas.id,
    topicId: topics.engineering.id,
    tagIds: [tags.performance.id, tags.measurement.id],
    coverId: covers.engineering.id,
    featured: true,
    related: ['caching-at-the-edge-carefully'],
    daysAgo: 70,
  },
  {
    slug: 'changelogs-people-actually-read',
    title: 'Changelogs people actually read',
    summary: 'Generated from commits, read by nobody. What we replaced it with.',
    authorId: priya.id,
    topicId: topics.writing.id,
    tagIds: [tags.releases.id, tags.craft.id],
    coverId: covers.writing.id,
    featured: false,
    related: ['a-style-guide-for-error-messages'],
    daysAgo: 58,
  },
  {
    slug: 'our-pull-request-checklist',
    title: 'Our pull request checklist',
    summary: 'The whole thing, on one screen. A checklist nobody finishes is one nobody starts.',
    authorId: priya.id,
    topicId: topics.process.id,
    tagIds: [tags.testing.id, tags.craft.id],
    coverId: covers.process.id,
    featured: false,
    related: ['what-we-learned-shipping-on-fridays', 'type-safety-is-a-team-sport'],
    daysAgo: 44,
  },
  {
    slug: 'caching-at-the-edge-carefully',
    title: 'Caching at the edge, carefully',
    summary: 'Enormous and free, right up until it serves one customer the data of another.',
    authorId: tomas.id,
    topicId: topics.engineering.id,
    tagIds: [tags.performance.id],
    coverId: covers.engineering.id,
    featured: false,
    related: ['the-cost-of-a-cold-start'],
    daysAgo: 33,
  },
  {
    slug: 'seven-minutes-to-the-first-win',
    title: 'Seven minutes to the first win',
    summary: 'Nobody experiences onboarding steps. They experience the gap before it works.',
    authorId: nadia.id,
    topicId: topics.design.id,
    tagIds: [tags.onboarding.id, tags.measurement.id],
    coverId: covers.design.id,
    featured: true,
    related: ['designing-the-empty-state'],
    daysAgo: 21,
  },
  {
    slug: 'how-we-run-a-design-critique',
    title: 'How we run a design critique',
    summary: 'Forty-five minutes, ten of them silent, and one person who decides.',
    authorId: priya.id,
    topicId: topics.process.id,
    tagIds: [tags.craft.id],
    coverId: covers.process.id,
    featured: true,
    related: ['our-pull-request-checklist'],
    daysAgo: 9,
  },
];

/** The Landing map, whose pitch is a body like any post's. */
export const landing = {
  headline: 'Careful work, shipped often',
  pitch: 'landing-pitch',
};

/** The markdown written for a post or the landing pitch. */
export function body(name: string): string {
  return fs.readFileSync(path.join(import.meta.dirname, 'bodies', `${name}.md`), 'utf8');
}
