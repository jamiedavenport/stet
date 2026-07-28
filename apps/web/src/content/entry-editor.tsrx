import { getRouteApi } from '@tanstack/react-router';

const route = getRouteApi('/app/c/$collection/$entry');

export function EntryEditor() @{
  const { type, entry } = route.useLoaderData();

  <div className="flex w-full flex-col gap-1">
    <h1 className="text-lg font-semibold tracking-tight">{entry}</h1>
    <p className="text-sm text-muted-foreground">{`An entry in ${type.name}.`}</p>
  </div>
}
