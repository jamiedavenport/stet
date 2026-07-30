import { useState } from 'react';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@repo/ui/components/card';
import { Separator } from '@repo/ui/components/separator';

import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';
import { ApiKeyCreated } from '#/developers/api-key-created.tsrx';
import { ApiKeyList } from '#/developers/api-key-list.tsrx';
import { CreateApiKeyForm } from '#/developers/api-key-create.tsrx';
import { apiKeysQuery } from '#/developers/functions';
import { useAppRoute } from '#/use-app-route';

export function ApiKeys() @{
  useBreadcrumbs([{ label: 'API keys' }]);
  const { activeOrganization } = useAppRoute();
  const { data } = useSuspenseQuery(apiKeysQuery(activeOrganization.id));
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<string | null>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: apiKeysQuery(activeOrganization.id).queryKey,
    });
  };

  const onCreated = async (key: string) => {
    setCreated(key);
    await refresh();
  };

  <div className="flex w-full max-w-2xl flex-col gap-6">
    <PageHeader
      title={"API keys"}
      description={"Keys the generated client and the CLI authenticate with. Each belongs to this organization and travels as the x-api-key header."}
    />
    <Card>
      <CardContent className="flex flex-col gap-4">
        @if (created === null) {
          <CreateApiKeyForm onCreated={onCreated} />
        } @else {
          <ApiKeyCreated apiKey={created} onDone={() => setCreated(null)} />
        }
        <Separator />
        <ApiKeyList keys={data} onRevoked={refresh} />
      </CardContent>
    </Card>
  </div>
}
