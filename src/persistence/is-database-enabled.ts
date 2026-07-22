/**
 * When false, MikroORM is not loaded and persistence is a no-op.
 * Defaults to true so existing deploys keep DB behavior.
 *
 * Relies on `ConfigModule.forRoot()` (or the process environment) having already
 * populated `process.env` before `PersistenceModule.register()` runs.
 */
export function isDatabaseEnabled(): boolean {
  const flag = process.env.ENABLE_DATABASE;
  if (flag === undefined || flag === '') return true;
  return !['false', '0', 'no', 'off'].includes(flag.toLowerCase());
}
