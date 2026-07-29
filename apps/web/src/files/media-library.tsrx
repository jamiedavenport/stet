import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';

export function MediaLibrary() @{
  useBreadcrumbs([{ label: 'Media' }]);

  <PageHeader
    title={"Media"}
    description={"Images and files, shared across every collection."}
  />
}
