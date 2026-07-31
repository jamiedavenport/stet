# @repo/audit

The audit trail: one row per discrete change to an organization's content, model, or assets. Where revisions (`@repo/content`) record what an entry looked like, the audit log records who did what, when, through which surface.

- `recordAudit()`: server-only; called from the domain operations in `@repo/content` and the asset flows in `apps/web`, so every write path is covered wherever it started (UI, AI tools, import). `coalesceMs` folds continuous edits into one row.
- `listAudit()`: a page of the log with actor names resolved, for the audit page in `apps/web`.
- `Actor` / `Via`: the attribution vocabulary. Every content-mutating operation takes an `Actor`; revisions reuse `Via` for their own attribution.

No queue or cron is involved: rows are written inline with the change, and the table cascades with the organization.
