import { Module } from '@nestjs/common';
import { DStorageModule } from '../dstorage/dstorage.module';
import { Iden3Module } from '../iden3/iden3.module';
import { SdJwtModule } from '../sd-jwt/sd-jwt.module';
import { PartnerJwtService } from '../services/partner-jwt.service';
import { IssuerService } from './issuer.service';

@Module({
  imports: [DStorageModule, Iden3Module, SdJwtModule],
  controllers: [],
  providers: [IssuerService, PartnerJwtService],
  exports: [IssuerService],
})
export class IssuerModule {}
