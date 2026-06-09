import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { DStorageModule } from '../dstorage/dstorage.module';

import { CredentialIssuingService } from './services/credential-issuing.service';

import { Credential } from './entities/credential.entity';

@Module({
  imports: [DStorageModule, MikroOrmModule.forFeature([Credential])],
  controllers: [],
  providers: [CredentialIssuingService],
  exports: [CredentialIssuingService],
})
export class Iden3Module {}
