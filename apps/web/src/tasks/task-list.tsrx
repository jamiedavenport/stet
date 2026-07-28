import { m } from '@repo/i18n/messages';
import { Button } from '@repo/ui/components/button';
import { CheckCircle2Icon, CircleIcon, Trash2Icon } from 'lucide-react';

import type { Task } from '#/tasks/doc';

type TaskListProps = {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onRemove: (id: string) => void;
};

export function TaskList({ tasks, onToggle, onRemove }: TaskListProps) @{
  <ul aria-label={m.tasks()} className="flex flex-col gap-1">
    @for (const task of tasks; key task.id) {
      <li className="group flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-muted/50">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={
            task.done
              ? m.mark_as_not_done({ title: task.title })
              : m.mark_as_done({ title: task.title })
          }
          aria-pressed={task.done}
          onClick={() => onToggle(task)}
        >
          @if (task.done) {
            <CheckCircle2Icon className="text-primary" />
          } @else {
            <CircleIcon className="text-muted-foreground" />
          }
        </Button>
        <span
          className={
            task.done ? 'flex-1 text-sm text-muted-foreground line-through' : 'flex-1 text-sm'
          }
        >
          {task.title}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={m.delete_task({ title: task.title })}
          onClick={() => onRemove(task.id)}
        >
          <Trash2Icon className="text-muted-foreground" />
        </Button>
      </li>
    } @empty {
      {/* map_iterable returns this inside an array, so it needs a key. */}
      <li key="empty" className="px-1 py-2 text-sm text-muted-foreground">
        {m.no_tasks_yet_add_one_below()}
      </li>
    }
  </ul>
}
