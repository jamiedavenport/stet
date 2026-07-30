import {
  BuildingOfficeIcon,
  BuildingsIcon,
  ChartBarIcon,
  CodeIcon,
  MegaphoneIcon,
  RocketLaunchIcon,
  ShapesIcon,
  SparkleIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import type { FeatureSlug } from '#/marketing/data/features';
import type { PersonaSlug } from '#/marketing/data/personas';

// Icons are components, and a route loader's return value has to survive
// being serialized into the page. Keeping them out of the copy data lets the
// dynamic routes hand their whole record to the client.

export const featureIcons: Record<FeatureSlug, Icon> = {
  content: ShapesIcon,
  'code-generation': CodeIcon,
  analytics: ChartBarIcon,
  ai: SparkleIcon,
};

export const personaIcons: Record<PersonaSlug, Icon> = {
  marketing: MegaphoneIcon,
  engineering: CodeIcon,
  agencies: BuildingsIcon,
  startups: RocketLaunchIcon,
  enterprise: BuildingOfficeIcon,
};
