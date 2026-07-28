import { m } from '@repo/i18n/messages';
import { usePageRoomContext } from '@repo/realtime/client';
import type { PageRoom } from '@repo/realtime/client';
import type { PresenceUser } from '@repo/realtime/types';
import { getLocale } from '@repo/i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Skeleton } from '@repo/ui/components/skeleton';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { notesPage } from '#/notes/doc';
import { notifyMention, savedNoteQuery } from '#/notes/functions';
import { NotesEditor } from '#/notes/notes-editor.tsrx';
import type { MentionMember } from '#/notes/mention';
import { fullOrganizationQuery } from '#/organization/functions';
import { timeAgo } from '#/time';
import { useAppRoute } from '#/use-app-route';

export const Route = createFileRoute('/app/notes')({
  component: NotesPage,
});

function NotesPage() {
  const { user, activeOrganization } = useAppRoute();
  const { room } = usePageRoomContext();

  // When navigating away, the layout swaps the context room to the next
  // page's while this page is still mounted. Binding the editor to that room
  // would write the caret's awareness state (and a stray `notes` fragment)
  // into the other page's room, so treat it as "not connected yet" instead.
  const notesRoom = room !== null && room.page === notesPage ? room : null;

  const organizationName = activeOrganization.name;

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>{m.notes()}</CardTitle>
        <CardDescription>
          {m.a_shared_document_for_everyone_edits({ organizationName })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NotesBody
          room={notesRoom}
          user={{ id: user.id, image: user.image ?? null, name: user.name }}
          organizationId={activeOrganization.id}
        />
      </CardContent>
      <CardFooter>
        <SavedNote organizationId={activeOrganization.id} />
      </CardFooter>
    </Card>
  );
}

// The document as D1 has it, which is the room's own snapshot flushed on a
// delay. Reading it here rather than from the shared doc is the point: it is
// the same view the public API and any export gets.
function SavedNote({ organizationId }: { organizationId: string }) {
  const { data } = useQuery(savedNoteQuery(organizationId));

  return <p className="text-xs text-muted-foreground">{savedLabel(data?.savedAt ?? null)}</p>;
}

function savedLabel(savedAt: string | null): string {
  if (savedAt === null) {
    return m.not_saved_to_the_database_yet();
  }
  return m.saved_to_the_database({ time: timeAgo(savedAt, getLocale()) });
}

type NotesBodyProps = {
  room: PageRoom | null;
  user: PresenceUser;
  organizationId: string;
};

function NotesBody({ room, user, organizationId }: NotesBodyProps) {
  // Not suspended on: the roster only feeds the `@` menu, so the editor should
  // come up as soon as the room does rather than waiting on the members query.
  const { data: organization } = useQuery(fullOrganizationQuery(organizationId));

  if (room === null) {
    return <Skeleton className="h-64 w-full" />;
  }

  const members: MentionMember[] =
    organization?.members.map((member) => ({
      id: member.userId,
      name: member.user.name,
      email: member.user.email,
    })) ?? [];

  return (
    <NotesEditor
      room={room}
      user={user}
      members={members}
      // Annotated because NotesEditor is a .tsrx module, whose props resolve
      // to `any` under the plugin-less type check `vp check` runs.
      onMention={(member: MentionMember) => {
        void notifyMention({ data: { userId: member.id } });
      }}
    />
  );
}
