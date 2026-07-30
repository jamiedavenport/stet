import { createContext, useContext, useMemo } from 'react';

import type { CellLookup } from '#/content/cells/lookup';

// What a cell needs to render a value that is an id: the titles and asset
// metadata the page loaded, and the organization its own pickers query.
//
// A context rather than props because the entry table memoizes its column
// definitions on the fields alone: rebuilding them remounts every cell and
// closes whatever editor was open, so data that changes with each save has to
// reach the cells around the columns rather than through them.

type CellData = {
  lookup: CellLookup;
  organizationId: string;
};

const empty: CellLookup = { entries: {}, assets: {} };

const CellDataContext = createContext<CellData>({ lookup: empty, organizationId: '' });

export function CellDataProvider(props: {
  lookup: CellLookup;
  organizationId: string;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ lookup: props.lookup, organizationId: props.organizationId }),
    [props.lookup, props.organizationId],
  );
  return <CellDataContext.Provider value={value}>{props.children}</CellDataContext.Provider>;
}

export function useCellData(): CellData {
  return useContext(CellDataContext);
}
