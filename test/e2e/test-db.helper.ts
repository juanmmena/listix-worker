import { execSync } from 'node:child_process';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import pg from 'pg';

export class TestDbHelper {
  private static container: StartedPostgreSqlContainer | null = null;
  private static pool: pg.Pool | null = null;

  static async setup(): Promise<string> {
    const defaultUrl =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/listix?schema=public';

    const isLocalAvailable = await TestDbHelper.canConnect(defaultUrl);

    if (isLocalAvailable) {
      process.env.DATABASE_URL = defaultUrl;
    } else {
      TestDbHelper.container = await new PostgreSqlContainer(
        'postgres:17-alpine',
      ).start();
      process.env.DATABASE_URL = TestDbHelper.container.getConnectionUri();
      execSync('npx prisma migrate deploy', {
        env: process.env,
        stdio: 'ignore',
      });
    }

    TestDbHelper.pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    return process.env.DATABASE_URL;
  }

  static async teardown(): Promise<void> {
    if (TestDbHelper.pool) {
      await TestDbHelper.pool.end();
      TestDbHelper.pool = null;
    }
    if (TestDbHelper.container) {
      await TestDbHelper.container.stop();
      TestDbHelper.container = null;
    }
  }

  static async clean(): Promise<void> {
    if (!TestDbHelper.pool) {
      TestDbHelper.pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
      });
    }
    await TestDbHelper.pool.query(
      'TRUNCATE TABLE list_items, list_invites, list_members, lists, refresh_tokens, users CASCADE;',
    );
  }

  private static async canConnect(connectionString: string): Promise<boolean> {
    const client = new pg.Client({
      connectionString,
      connectionTimeoutMillis: 1500,
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch {
      try {
        await client.end();
      } catch {
        // ignore
      }
      return false;
    }
  }
}
