import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { CredentialIssuingService } from './services/credential-issuing.service';

import { Credential } from './entities/credential.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Credential])],
  controllers: [],
  providers: [CredentialIssuingService],
  exports: [CredentialIssuingService],
})
export class Iden3Module {}
