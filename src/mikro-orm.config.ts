import { defineConfig, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TSMigrationGenerator } from '@mikro-orm/migrations';

import 'dotenv/config';

const clientUrl = process.env.DATABASE_URL;
if (!clientUrl) throw new Error('Missing ENV: DATABASE_URL');

export default defineConfig({
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  driver: PostgreSqlDriver,
  clientUrl,
  allowGlobalContext: process.env.RUNNER === 'true',
  logger: console.log,
  debug: true,
  migrations: {
    snapshotName: 'schema-snapshot',
    safe: false,
    path: './dist/migrations',
    pathTs: './src/migrations',
    glob: '!(*.d).{js,ts}',
    transactional: true,
    allOrNothing: true,
    generator: TSMigrationGenerator,
  },
});
