import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './index';

export function runMigrations() {
  migrate(db, { migrationsFolder: './drizzle' });
}
