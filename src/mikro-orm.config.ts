import { defineConfig, PostgreSqlDriver, EntityManager } from '@mikro-orm/postgresql';
import { TSMigrationGenerator } from '@mikro-orm/migrations';

import 'dotenv/config';

const NODE_ENV = process.env.NODE_ENV ?? 'production';
const isRunner = process.env.RUNNER === 'true';
const clientUrl = process.env.DATABASE_URL || undefined;

let dbName: string | undefined = undefined;

if (!clientUrl) {
  dbName = 'dump';
  EntityManager.prototype.flush = () => Promise.resolve();
  EntityManager.prototype.count = () => Promise.resolve(0);
  EntityManager.prototype.find = () => Promise.resolve([]);
  EntityManager.prototype.findOne = () => Promise.resolve(null);
  EntityManager.prototype.findAndCount = () => Promise.resolve([[], 0]);
  EntityManager.prototype.nativeUpdate = () => Promise.resolve(0);
  EntityManager.prototype.getConnection = () => ({
    transactional: (cb) => cb(),
  });
}

const logger = NODE_ENV === 'development' ? console.log : undefined;

export default defineConfig({
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  driver: PostgreSqlDriver,
  clientUrl,
  dbName,
  allowGlobalContext: isRunner,
  logger,
  debug: NODE_ENV === 'development',
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
