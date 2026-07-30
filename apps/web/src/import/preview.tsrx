import { useEffect, useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Skeleton } from '@repo/ui/components/skeleton';
import { Textarea } from '@repo/ui/components/textarea';

import { previewImportExtraction } from '#/import/functions';
import type { ExtractionPreview, PlannedType } from '#/import/functions';

export function PreviewStep(props: {
  types: PlannedType[];
  onChange: (types: PlannedType[]) => void;
  onBack: () => void;
  onStart: () => Promise<void>;
}) @{
  const [previews, setPreviews] = useState<Record<number, ExtractionPreview[]>>({});
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = props.types.map((type, index) => ({ type, index }));

  const runPreviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        props.types.map((type) => previewImportExtraction({ data: { type } })),
      );
      setPreviews(Object.fromEntries(results.map((result, index) => [index, result])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Preview failed.');
    } finally {
      setLoading(false);
    }
  };

  // The first previews run on arrival; re-runs are explicit, after steering.
  useEffect(() => {
    void runPreviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await props.onStart();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the import.');
      setStarting(false);
    }
  };

  const totalPages = props.types.reduce((sum, type) => sum + type.urls.length, 0);

  <div className="flex max-w-3xl flex-col gap-4">
    <p className="text-sm text-muted-foreground">
      {"Sample extractions, straight from the real pages. If something landed wrong, say so in the guidance box and re-run; the guidance also steers the full import."}
    </p>
    @for (const row of rows; key row.index) {
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{row.type.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          @if (loading) {
            <Skeleton className="h-24 w-full" />
          }
          @if (!loading) {
            @for (const preview of previews[row.index] ?? []; key preview.url) {
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <span className="text-xs text-muted-foreground">{new URL(preview.url).pathname}</span>
                @if (preview.error !== null) {
                  <p className="text-sm text-destructive">{preview.error}</p>
                }
                @if (preview.entry !== null && !preview.entry.matches) {
                  <p className="text-sm text-muted-foreground">
                    {"Not recognized as an entry of this type; the import would skip it."}
                  </p>
                }
                @if (preview.entry !== null && preview.entry.matches) {
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{preview.entry.title}</span>
                    @for (const line of valueLines(preview.entry.values); key line) {
                      <span className="text-xs text-muted-foreground">{line}</span>
                    }
                    @for (const body of bodySnippets(preview.entry.bodies); key body) {
                      <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
                        {body}
                      </pre>
                    }
                  </div>
                }
              </div>
            }
          }
          <Textarea
            value={row.type.steer ?? ''}
            onChange={(event) =>
              props.onChange(
                props.types.map((type, at) =>
                  at === row.index
                    ? { ...type, steer: event.target.value === '' ? undefined : event.target.value }
                    : type,
                ),
              )
            }
            placeholder="Guidance for this type, e.g. the author is in the byline under the title"
            className="min-h-16 text-sm"
          />
        </CardContent>
      </Card>
    }
    @if (error !== null) {
      <p className="text-sm text-destructive">{error}</p>
    }
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={props.onBack} disabled={loading || starting}>
        {"Back"}
      </Button>
      <Button variant="outline" onClick={() => void runPreviews()} disabled={loading || starting}>
        {loading ? 'Extracting…' : 'Re-run preview'}
      </Button>
      <Button onClick={() => void start()} disabled={loading || starting}>
        {starting ? 'Starting…' : `Import ${totalPages} ${totalPages === 1 ? 'page' : 'pages'}`}
      </Button>
    </div>
  </div>
}

function valueLines(values: Record<string, string | number | boolean | string[] | null>): string[] {
  return Object.entries(values)
    .filter(([, value]) => value !== null)
    .map(([name, value]) => `${name}: ${Array.isArray(value) ? value.join(', ') : String(value)}`);
}

function bodySnippets(bodies: Record<string, string>): string[] {
  return Object.values(bodies)
    .filter((markdown) => markdown.trim() !== '')
    .map((markdown) => (markdown.length > 600 ? `${markdown.slice(0, 600)}…` : markdown));
}
