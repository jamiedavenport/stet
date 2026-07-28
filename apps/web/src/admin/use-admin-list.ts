import { useState } from 'react';

/**
 * Search-and-page state shared by the admin user and organization tables.
 * `draft` is what the box holds; `search` is what the query runs on, so
 * typing does not fire a request per keystroke.
 */
export function useAdminList() {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  return {
    draft,
    search,
    page,
    setDraft,
    // Both searching and clearing restart paging: page 3 of the previous
    // result set says nothing about the new one.
    submit: () => {
      setSearch(draft.trim());
      setPage(0);
    },
    clear: () => {
      setDraft('');
      setSearch('');
      setPage(0);
    },
    previous: () => setPage((current) => Math.max(0, current - 1)),
    next: () => setPage((current) => current + 1),
  };
}

export type AdminListState = ReturnType<typeof useAdminList>;
