import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
import {
  BellIcon,
  BracesIcon,
  CreditCardIcon,
  KeyRoundIcon,
  PaperclipIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  WorkflowIcon,
  ZapIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Marketing copy and data; edit the messages in @repo/i18n (and @repo/brand)
// to re-pitch without touching layout.
//
// These are functions, not constants: a message called at module scope would
// freeze the locale at import time, so each one is built during render.

export type Feature = { icon: LucideIcon; name: string; description: string };

export function features(): Feature[] {
  return [
    {
      icon: KeyRoundIcon,
      name: m.marketing_feature_auth_name(),
      description: m.marketing_feature_auth_description(),
    },
    {
      icon: UsersIcon,
      name: m.marketing_feature_orgs_name(),
      description: m.marketing_feature_orgs_description(),
    },
    {
      icon: CreditCardIcon,
      name: m.marketing_feature_billing_name(),
      description: m.marketing_feature_billing_description(),
    },
    {
      icon: BracesIcon,
      name: m.marketing_feature_api_name(),
      description: m.marketing_feature_api_description(),
    },
    {
      icon: ZapIcon,
      name: m.marketing_feature_realtime_name(),
      description: m.marketing_feature_realtime_description(),
    },
    {
      icon: SparklesIcon,
      name: m.marketing_feature_ai_name(),
      description: m.marketing_feature_ai_description(),
    },
    {
      icon: WorkflowIcon,
      name: m.marketing_feature_background_name(),
      description: m.marketing_feature_background_description(),
    },
    {
      icon: PaperclipIcon,
      name: m.marketing_feature_files_name(),
      description: m.marketing_feature_files_description(),
    },
    {
      icon: BellIcon,
      name: m.marketing_feature_notifications_name(),
      description: m.marketing_feature_notifications_description(),
    },
    {
      icon: ShieldCheckIcon,
      name: m.marketing_feature_tested_name(),
      description: m.marketing_feature_tested_description(),
    },
  ];
}

// Package names are identifiers, so only the descriptions are translated.
export function packages() {
  return [
    { name: 'apps/web', description: m.marketing_package_web_description() },
    { name: 'apps/docs', description: m.marketing_package_docs_description() },
    { name: '@repo/ui', description: m.marketing_package_ui_description() },
    { name: '@repo/auth', description: m.marketing_package_auth_description() },
    { name: '@repo/billing', description: m.marketing_package_billing_description() },
    { name: '@repo/db', description: m.marketing_package_db_description() },
    { name: '@repo/api', description: m.marketing_package_api_description() },
    { name: '@repo/mail', description: m.marketing_package_mail_description() },
    { name: '@repo/ai', description: m.marketing_package_ai_description() },
    { name: '@repo/realtime', description: m.marketing_package_realtime_description() },
    { name: '@repo/notifications', description: m.marketing_package_notifications_description() },
    {
      name: '@repo/crons · jobs · workflows',
      description: m.marketing_package_background_description(),
    },
    { name: '@repo/logging', description: m.marketing_package_logging_description() },
    {
      name: '@jxdltd/onyx-client · cli',
      description: m.marketing_package_published_description(),
    },
  ];
}

// Product and vendor names, identical in every locale.
export const stack = [
  'Cloudflare',
  'TanStack Start',
  'React 19',
  'Drizzle + D1',
  'Better Auth',
  'Stripe',
  'Tailwind CSS v4',
  'Vite+',
];

export function faqs() {
  return [
    { term: m.marketing_faq_contents_term(), detail: m.marketing_faq_contents_detail() },
    { term: m.marketing_faq_cloudflare_term(), detail: m.marketing_faq_cloudflare_detail() },
    { term: m.marketing_faq_lockin_term(), detail: m.marketing_faq_lockin_detail() },
    { term: m.marketing_faq_updates_term(), detail: m.marketing_faq_updates_detail() },
    { term: m.marketing_faq_agents_term(), detail: m.marketing_faq_agents_detail() },
    {
      term: m.marketing_faq_license_term(),
      detail: m.marketing_faq_license_detail({ email: brand.email }),
    },
  ];
}

export function devLoop() {
  return [
    { command: 'vp install', note: null },
    { command: 'vp run dev', note: m.marketing_dev_loop_note() },
  ];
}

// Cloudflare product names, identical in every locale.
export function bindings() {
  return [
    { term: 'D1', detail: m.marketing_binding_d1_detail() },
    { term: 'R2', detail: m.marketing_binding_r2_detail() },
    { term: 'Queues', detail: m.marketing_binding_queues_detail() },
    { term: 'Durable Objects', detail: m.marketing_binding_do_detail() },
    { term: 'Cron Triggers', detail: m.marketing_binding_crons_detail() },
    { term: 'Workflows', detail: m.marketing_binding_workflows_detail() },
  ];
}
