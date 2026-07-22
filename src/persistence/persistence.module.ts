import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DynamicModule, Module } from '@nestjs/common';
import { Credential } from '../iden3/entities/credential.entity';
import { Revocation } from '../iden3/entities/revocation.entity';
import { CredentialIssuance } from '../issuer/entities/credential-issuance.entity';
import { DbPersistenceService } from './db-persistence.service';
import { isDatabaseEnabled } from './is-database-enabled';
import { NoopPersistenceService } from './noop-persistence.service';
import { PersistenceService } from './persistence.service';

@Module({})
export class PersistenceModule {
  static register(): DynamicModule {
    if (isDatabaseEnabled()) {
      // Lazy: mikro-orm.config throws when DATABASE_URL is missing
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mikroOrmConfig = require('../mikro-orm.config').default;

      return {
        module: PersistenceModule,
        global: true,
        imports: [
          MikroOrmModule.forRoot(mikroOrmConfig),
          MikroOrmModule.forFeature([Credential, Revocation, CredentialIssuance]),
        ],
        providers: [{ provide: PersistenceService, useClass: DbPersistenceService }],
        exports: [PersistenceService],
      };
    }

    return {
      module: PersistenceModule,
      global: true,
      providers: [{ provide: PersistenceService, useClass: NoopPersistenceService }],
      exports: [PersistenceService],
    };
  }
}
