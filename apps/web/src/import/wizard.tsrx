import { useState } from 'react';

import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';
import { discoverImportSite, proposeImportModel, startImport } from '#/import/functions';
import type { Discovery, PlannedType } from '#/import/functions';
import { PointStep } from '#/import/point.tsrx';
import { ScopeStep } from '#/import/scope.tsrx';
import type { ScopeGroup } from '#/import/scope.tsrx';
import { ReviewStep } from '#/import/review.tsrx';
import type { SkippedGroup } from '#/import/review.tsrx';
import { PreviewStep } from '#/import/preview.tsrx';
import { RunStep } from '#/import/run.tsrx';

type WizardStep = 'point' | 'scope' | 'review' | 'preview' | 'run';

const steps: { id: WizardStep; label: string }[] = [
  { id: 'point', label: 'Site' },
  { id: 'scope', label: 'Scope' },
  { id: 'review', label: 'Model' },
  { id: 'preview', label: 'Preview' },
  { id: 'run', label: 'Import' },
];

/**
 * The site import wizard: point at a URL, choose the sections, review the
 * proposed model, check sample extractions, then watch the run. Every step
 * before the run is a review point; nothing is created until the user starts
 * the import.
 */
export function ImportWizard() @{
  useBreadcrumbs([{ label: 'Import' }]);

  const [step, setStep] = useState<WizardStep>('point');
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [groups, setGroups] = useState<ScopeGroup[]>([]);
  const [types, setTypes] = useState<PlannedType[]>([]);
  const [skipped, setSkipped] = useState<SkippedGroup[]>([]);
  const [runId, setRunId] = useState<string | null>(null);

  const scan = async (url: string) => {
    const found = await discoverImportSite({ data: { url } });
    setDiscovery(found);
    setGroups(found.groups.map((group) => ({ ...group, included: true, note: '' })));
    setStep('scope');
  };

  const propose = async () => {
    if (discovery === null) {
      return;
    }
    const included = groups
      .filter((group) => group.included)
      .slice(0, 8)
      .map((group) => ({
        id: group.id,
        pattern: group.pattern,
        urls: group.urls,
        hubUrl: group.hubUrl,
        note: group.note === '' ? undefined : group.note,
      }));
    const proposal = await proposeImportModel({
      data: { origin: discovery.origin, groups: included },
    });
    setTypes(proposal.types);
    setSkipped(proposal.skipped);
    setStep('review');
  };

  const start = async () => {
    if (discovery === null) {
      return;
    }
    const result = await startImport({ data: { plan: { origin: discovery.origin, types } } });
    setRunId(result.runId);
    setStep('run');
  };

  const current = steps.findIndex((candidate) => candidate.id === step);

  <div className="flex w-full flex-col gap-6">
    <PageHeader
      title={"Import"}
      description={"Bring an existing site's content into Stet."}
    />
    <ol className="flex items-center gap-1 text-sm">
      @for (const item of steps; key item.id) {
        <li className="flex items-center gap-1">
          @if (steps.indexOf(item) > 0) {
            <span className="px-1 text-muted-foreground/50">{"/"}</span>
          }
          <span
            className={
              steps.indexOf(item) === current
                ? 'font-medium text-foreground'
                : steps.indexOf(item) < current
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/50'
            }
          >
            {item.label}
          </span>
        </li>
      }
    </ol>
    @if (step === 'point') {
      <PointStep onScan={scan} />
    }
    @if (step === 'scope' && discovery !== null) {
      <ScopeStep
        groups={groups}
        truncated={discovery.truncated}
        onChange={setGroups}
        onBack={() => setStep('point')}
        onPropose={propose}
      />
    }
    @if (step === 'review') {
      <ReviewStep
        types={types}
        skipped={skipped}
        onChange={setTypes}
        onBack={() => setStep('scope')}
        onContinue={() => setStep('preview')}
      />
    }
    @if (step === 'preview') {
      <PreviewStep
        types={types}
        onChange={setTypes}
        onBack={() => setStep('review')}
        onStart={start}
      />
    }
    @if (step === 'run' && runId !== null) {
      <RunStep runId={runId} />
    }
  </div>
}
