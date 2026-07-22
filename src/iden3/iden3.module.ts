import { Module } from '@nestjs/common';

import { DStorageModule } from '../dstorage/dstorage.module';

import { CredentialIssuingService } from './services/credential-issuing.service';

@Module({
  imports: [DStorageModule],
  controllers: [],
  providers: [CredentialIssuingService],
  exports: [CredentialIssuingService],
})
export class Iden3Module {}
