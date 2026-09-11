import { Module } from '@nestjs/common';

import { DStorageModule } from '../dstorage/dstorage.module';
import { DidService } from '../services/did.service';
import { PartnerJwtService } from '../services/partner-jwt.service';
import { SdJwtVcService } from './services/sd-jwt-vc.service';
import { TokenStatusListService } from './services/token-status-list.service';

@Module({
  imports: [DStorageModule],
  controllers: [],
  providers: [SdJwtVcService, TokenStatusListService, PartnerJwtService, DidService],
  exports: [SdJwtVcService, TokenStatusListService],
})
export class SdJwtModule {}
