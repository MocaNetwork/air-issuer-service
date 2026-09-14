import { Module } from '@nestjs/common';
import { DStorageModule } from '../dstorage/dstorage.module';
import { SdJwtModule } from '../sd-jwt/sd-jwt.module';
import { PartnerJwtService } from '../services/partner-jwt.service';
import { IssuerService } from './issuer.service';

@Module({
  imports: [DStorageModule, SdJwtModule],
  controllers: [],
  providers: [IssuerService, PartnerJwtService],
  exports: [IssuerService],
})
export class IssuerModule {}
