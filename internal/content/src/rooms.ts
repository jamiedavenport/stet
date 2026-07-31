/**
 * The page whose realtime room carries a content type: the route that renders
 * it, because `PageRoomProvider` names a room after the pathname the browser
 * is on. Server-side broadcasts have to address the room the people watching
 * are actually in, so the route shape lives here rather than in `apps/web`,
 * where only one of the two sides could see it.
 */
export function contentTypePage(type: { kind: string; slug: string }): string {
  return type.kind === 'map' ? `/app/m/${type.slug}` : `/app/c/${type.slug}`;
}
