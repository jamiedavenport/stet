import { useState } from 'react';
import { track } from '@repo/analytics/client';
import { m } from '@repo/i18n/messages';
import { usePageRoomContext } from '@repo/realtime/client';
import type { PageRoom } from '@repo/realtime/client';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Input } from '@repo/ui/components/input';
import { Skeleton } from '@repo/ui/components/skeleton';
import { createFileRoute } from '@tanstack/react-router';

import { TaskList } from '#/tasks/task-list.tsrx';
import { useAppRoute } from '#/use-app-route';
import { addTask, getTaskMap, removeTask, toggleTask, useTasks } from '#/tasks/doc';
import type { Task } from '#/tasks/doc';

export const Route = createFileRoute('/app/tasks')({
  component: TasksPage,
});

function TasksPage() {
  const { activeOrganization } = useAppRoute();
  const { room } = usePageRoomContext();
  const organizationName = activeOrganization.name;

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{m.tasks()}</CardTitle>
        <CardDescription>{m.a_shared_task_list_for_changes({ organizationName })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <TasksBody room={room} />
      </CardContent>
    </Card>
  );
}

function TasksBody({ room }: { room: PageRoom | null }) {
  if (room === null) {
    return <Skeleton className="h-24 w-full" />;
  }
  return <ConnectedTasks room={room} />;
}

function ConnectedTasks({ room }: { room: PageRoom }) {
  const tasks = useTasks(room.doc);
  const [title, setTitle] = useState('');
  const map = getTaskMap(room.doc);

  const submit = () => {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      return;
    }
    addTask(map, trimmed);
    track('task_created');
    setTitle('');
  };

  return (
    <>
      <TaskList
        tasks={tasks}
        onToggle={(task: Task) => toggleTask(map, task)}
        onRemove={(id: string) => removeTask(map, id)}
      />
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Input
          aria-label={m.new_task()}
          placeholder={m.add_a_task()}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button type="submit">{m.add()}</Button>
      </form>
    </>
  );
}
