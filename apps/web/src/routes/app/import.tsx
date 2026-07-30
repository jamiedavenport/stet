import { createFileRoute } from '@tanstack/react-router';

import { ImportWizard } from '#/import/wizard.tsrx';

export const Route = createFileRoute('/app/import')({
  component: ImportWizard,
});
