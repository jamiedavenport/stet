import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Actions rendered on the trailing edge, aligned with the title. */
  children?: ReactNode;
};

/** The heading block every app page opens with, so pages share one rhythm. */
export function PageHeader(props: PageHeaderProps) @{
  <header className="flex w-full flex-wrap items-end justify-between gap-4">
    <div className="flex max-w-2xl flex-col gap-1.5">
      <h1 className="text-xl font-semibold tracking-tight text-balance">{props.title}</h1>
      @if (props.description !== undefined) {
        <p className="text-sm text-pretty text-muted-foreground">{props.description}</p>
      }
    </div>
    @if (props.children !== undefined) {
      <div className="flex items-center gap-2">{props.children}</div>
    }
  </header>
}
