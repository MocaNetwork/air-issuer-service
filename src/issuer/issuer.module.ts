import { Module } from '@nestjs/common';
import { AirApiModule } from '../air-api/air-api.module';
import { DStorageModule } from '../dstorage/dstorage.module';
import { SdJwtModule } from '../sd-jwt/sd-jwt.module';
import { PartnerJwtService } from '../services/partner-jwt.service';
import { IssuerService } from './issuer.service';

@Module({
  imports: [AirApiModule, DStorageModule, SdJwtModule],
  controllers: [],
  providers: [IssuerService, PartnerJwtService],
  exports: [IssuerService],
})
export class IssuerModule {}
