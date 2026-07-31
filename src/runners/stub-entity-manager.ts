import { EntityManager } from '@mikro-orm/postgresql';

/** No-op EntityManager for runners that issue VCs without persisting to Postgres. */
export function createStubEntityManager(): EntityManager {
  const stub = {
    persist: () => stub,
    flush: () => Promise.resolve(),
    findOne: () => Promise.resolve(null),
    count: () => Promise.resolve(0),
  };

  return stub as unknown as EntityManager;
}
