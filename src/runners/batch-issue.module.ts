import { EntityManager } from '@mikro-orm/postgresql';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DStorageModule } from '../dstorage/dstorage.module';
import { HttpModule } from '../dynamic-modules/http-module';
import { CredentialIssuingService } from '../iden3/services/credential-issuing.service';
import { PartnerJwtService } from '../services/partner-jwt.service';

import { createStubEntityManager } from './stub-entity-manager';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HttpModule, DStorageModule],
  providers: [
    { provide: EntityManager, useValue: createStubEntityManager() },
    CredentialIssuingService,
    PartnerJwtService,
  ],
})
export class BatchIssueModule {}
