import { Module } from '@nestjs/common';
import { DStorageModule } from '../dstorage/dstorage.module';
import { Iden3Module } from '../iden3/iden3.module';
import { SdJwtModule } from '../sd-jwt/sd-jwt.module';
import { PartnerJwtService } from '../services/partner-jwt.service';
import { IssuerService } from './issuer.service';
import { SdJwtVcIssuerService } from './sd-jwt-vc-issuer.service';

@Module({
  imports: [DStorageModule, Iden3Module, SdJwtModule],
  controllers: [],
  providers: [IssuerService, SdJwtVcIssuerService, PartnerJwtService],
  exports: [IssuerService, SdJwtVcIssuerService],
})
export class IssuerModule {}
