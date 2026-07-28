import { m } from '@repo/i18n/messages';
import {
  CalendarClockIcon,
  ChartNoAxesColumnIcon,
  LanguagesIcon,
  PenLineIcon,
  ShapesIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Marketing copy and data; edit the messages in @repo/i18n (and @repo/brand)
// to re-pitch without touching layout.
//
// These are functions, not constants: a message called at module scope would
// freeze the locale at import time, so each one is built during render.

export type Feature = { icon: LucideIcon; name: string; description: string };

/** What the editor side of the product does, for the landing page grid. */
export function contentFeatures(): Feature[] {
  return [
    {
      icon: ShapesIcon,
      name: m.marketing_content_model_name(),
      description: m.marketing_content_model_description(),
    },
    {
      icon: UsersIcon,
      name: m.marketing_content_collab_name(),
      description: m.marketing_content_collab_description(),
    },
    {
      icon: CalendarClockIcon,
      name: m.marketing_content_publish_name(),
      description: m.marketing_content_publish_description(),
    },
    {
      icon: LanguagesIcon,
      name: m.marketing_content_locales_name(),
      description: m.marketing_content_locales_description(),
    },
    {
      icon: ShieldCheckIcon,
      name: m.marketing_content_review_name(),
      description: m.marketing_content_review_description(),
    },
    {
      icon: SparklesIcon,
      name: m.marketing_content_ai_name(),
      description: m.marketing_content_ai_description(),
    },
    {
      icon: ChartNoAxesColumnIcon,
      name: m.marketing_content_analytics_name(),
      description: m.marketing_content_analytics_description(),
    },
    {
      icon: PenLineIcon,
      name: m.marketing_content_editor_name(),
      description: m.marketing_content_editor_description(),
    },
  ];
}

/** What the developer side of the product does, for the landing page rows. */
export function engineerPoints() {
  return [
    { term: m.marketing_eng_client_term(), detail: m.marketing_eng_client_detail() },
    { term: m.marketing_eng_deprecations_term(), detail: m.marketing_eng_deprecations_detail() },
    { term: m.marketing_eng_drafts_term(), detail: m.marketing_eng_drafts_detail() },
    { term: m.marketing_eng_api_term(), detail: m.marketing_eng_api_detail() },
    { term: m.marketing_eng_analytics_term(), detail: m.marketing_eng_analytics_detail() },
    { term: m.marketing_eng_webhooks_term(), detail: m.marketing_eng_webhooks_detail() },
  ];
}
