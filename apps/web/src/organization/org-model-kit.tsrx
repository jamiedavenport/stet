import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError } from '@repo/ui/components/field';
import { DownloadSimpleIcon } from '@phosphor-icons/react';

import { exportModelKit } from '#/organization/model-kit-functions';

export function OrgModelKit() @{
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setPending(true);
    setError(null);
    try {
      const kit = await exportModelKit();
      const blob = new Blob([`${JSON.stringify(kit, null, 2)}\n`], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${kit.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')}.stet-kit.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export model kit.');
    } finally {
      setPending(false);
    }
  };

  <Card>
    <CardHeader>
      <CardTitle>{"Model kit"}</CardTitle>
      <CardDescription>{"Reuse this content model in a new organization."}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col items-start gap-4">
      <p className="text-base text-pretty text-muted-foreground sm:text-sm">
        {"The JSON file includes collections, maps, fields, options, and references. It never includes entries, members, integrations, or analytics."}
      </p>
      @if (error) {
        <FieldError>{error}</FieldError>
      }
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => void download()}>
        <DownloadSimpleIcon data-icon="inline-start" />
        {pending ? "Exporting…" : "Export model kit"}
      </Button>
    </CardContent>
  </Card>
}
