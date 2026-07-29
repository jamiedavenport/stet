import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';

export function ApiKeys() @{
  useBreadcrumbs([{ label: 'API keys' }]);

  <PageHeader
    title={"API keys"}
    description={"Keys the generated client and the CLI authenticate with."}
  />
}
