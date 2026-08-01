import Sqlite from 'better-sqlite3';
import { describe, expect, it } from 'vite-plus/test';

import { schemaMigrations } from './schema';

describe('schema migrations', () => {
  it('adds routes and preserves historical path rollups', () => {
    const sqlite = new Sqlite(':memory:');
    const initial = schemaMigrations[0];
    const routes = schemaMigrations[1];
    if (initial === undefined || routes === undefined) {
      throw new Error('expected initial and route migrations');
    }

    for (const statement of initial.statements) {
      sqlite.exec(statement);
    }
    sqlite
      .prepare(
        `INSERT INTO events (id, name, timestamp, path, props, context)
         VALUES ('event-1', '$pageview', 1, '/blog/first', '{}', '{}')`,
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO rollups (bucket, dimension, key, count)
         VALUES (0, 'path', '/blog/first', 3)`,
      )
      .run();

    for (const statement of routes.statements) {
      sqlite.exec(statement);
    }

    expect(sqlite.prepare('SELECT route FROM events').get()).toEqual({ route: '/blog/first' });
    expect(
      sqlite.prepare("SELECT key, count FROM rollups WHERE dimension = 'route'").get(),
    ).toEqual({ key: '/blog/first', count: 3 });
  });
});
