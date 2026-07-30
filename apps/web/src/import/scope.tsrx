import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Input } from '@repo/ui/components/input';

import type { DiscoveredGroup } from '#/import/functions';

export type ScopeGroup = DiscoveredGroup & {
  included: boolean;
  note: string;
};

export function ScopeStep(props: {
  groups: ScopeGroup[];
  truncated: boolean;
  onChange: (groups: ScopeGroup[]) => void;
  onBack: () => void;
  onPropose: () => Promise<void>;
}) @{
  const [proposing, setProposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const includedCount = props.groups.filter((group) => group.included).length;

  const update = (id: string, patch: Partial<ScopeGroup>) => {
    props.onChange(
      props.groups.map((group) => (group.id === id ? { ...group, ...patch } : group)),
    );
  };

  const propose = async () => {
    setProposing(true);
    setError(null);
    try {
      await props.onPropose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not propose a model.');
    } finally {
      setProposing(false);
    }
  };

  <div className="flex max-w-3xl flex-col gap-4">
    <p className="text-sm text-muted-foreground">
      {"Choose the sections worth importing. A note tells the model what a section is, the way you would tell a colleague."}
    </p>
    @if (props.truncated) {
      <p className="text-sm text-muted-foreground">
        {"The site lists more pages than an import covers; only the first 300 are here."}
      </p>
    }
    <div className="flex flex-col gap-2">
      @for (const group of props.groups; key group.id) {
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox
            checked={group.included}
            aria-label={`Include ${group.pattern}`}
            className="mt-0.5"
            onCheckedChange={(checked) => update(group.id, { included: checked === true })}
          />
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium">{group.pattern}</span>
            <span className="text-xs text-muted-foreground">
              {`${group.urls.length} ${group.urls.length === 1 ? 'page' : 'pages'}, e.g. ${group.urls
                .slice(0, 2)
                .map((url) => new URL(url).pathname)
                .join(', ')}`}
            </span>
            @if (group.included) {
              <Input
                value={group.note}
                onChange={(event) => update(group.id, { note: event.target.value })}
                placeholder="Optional note, e.g. this is the blog"
                className="mt-1 h-8"
              />
            }
          </div>
        </div>
      }
    </div>
    @if (error !== null) {
      <p className="text-sm text-destructive">{error}</p>
    }
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={props.onBack} disabled={proposing}>
        {"Back"}
      </Button>
      <Button onClick={() => void propose()} disabled={proposing || includedCount === 0}>
        {proposing ? 'Reading sample pages…' : 'Propose a model'}
      </Button>
    </div>
  </div>
}
