import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { LinkProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';

/** One step of the trail. Crumbs without `to` render as plain text. */
export type Crumb = {
  label: string;
  to?: LinkProps['to'];
  params?: LinkProps['params'];
};

type BreadcrumbsState = {
  crumbs: readonly Crumb[];
  setCrumbs: (crumbs: readonly Crumb[]) => void;
};

const BreadcrumbsContext = createContext<BreadcrumbsState | null>(null);

// Written as plain TSX rather than TSRX: this file is mostly context and a
// hook, and the trail interleaves separators by index.
export function BreadcrumbsProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<readonly Crumb[]>([]);
  const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs]);
  return <BreadcrumbsContext.Provider value={value}>{children}</BreadcrumbsContext.Provider>;
}

function useBreadcrumbsContext(): BreadcrumbsState {
  const context = useContext(BreadcrumbsContext);
  if (context === null) {
    throw new Error('Breadcrumbs must be used inside a BreadcrumbsProvider.');
  }
  return context;
}

/** Called by each page to name the trail the app header shows. */
export function useBreadcrumbs(crumbs: readonly Crumb[]) {
  const { setCrumbs } = useBreadcrumbsContext();
  // Serialized so a page re-rendering with the same trail never loops the
  // effect, while a renamed entry still updates the header.
  const key = JSON.stringify(crumbs);
  useEffect(() => {
    setCrumbs(JSON.parse(key) as readonly Crumb[]);
    return () => setCrumbs([]);
  }, [setCrumbs, key]);
}

export function Breadcrumbs() {
  const { crumbs } = useBreadcrumbsContext();
  if (crumbs.length === 0) {
    return null;
  }
  return (
    <nav aria-label="Breadcrumb">
      <ol role="list" className="flex flex-wrap items-center gap-2 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {index > 0 ? <span className="text-muted-foreground/50">/</span> : null}
              {last || crumb.to === undefined ? (
                <span
                  aria-current={last ? 'page' : undefined}
                  className="truncate font-medium text-foreground"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  params={crumb.params}
                  className="truncate text-muted-foreground hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
