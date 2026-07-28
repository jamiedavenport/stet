import { useEffect, useState } from 'react';
import type * as Y from 'yjs';

export type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

// Task values arrive from other clients through the shared doc, so validate
// the shape before rendering anything from them.
function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const task = value as { id?: unknown; title?: unknown; done?: unknown; createdAt?: unknown };
  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    typeof task.done === 'boolean' &&
    typeof task.createdAt === 'number'
  );
}

// Tasks live in a Y.Map keyed by id so edits from different clients merge
// per-task instead of clobbering the whole list.
export function getTaskMap(doc: Y.Doc): Y.Map<Task> {
  return doc.getMap<Task>('tasks');
}

export function useTasks(doc: Y.Doc): Task[] {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const map = getTaskMap(doc);
    const update = () => {
      setTasks(readTasks(map));
    };

    map.observe(update);
    update();

    return () => {
      map.unobserve(update);
    };
  }, [doc]);

  return tasks;
}

export function addTask(map: Y.Map<Task>, title: string): void {
  const id = crypto.randomUUID();
  map.set(id, { id, title, done: false, createdAt: Date.now() });
}

export function toggleTask(map: Y.Map<Task>, task: Task): void {
  map.set(task.id, { ...task, done: !task.done });
}

export function removeTask(map: Y.Map<Task>, id: string): void {
  map.delete(id);
}

function readTasks(map: Y.Map<Task>): Task[] {
  const tasks: Task[] = [];
  for (const value of map.values()) {
    if (isTask(value)) {
      tasks.push(value);
    }
  }
  return tasks.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
