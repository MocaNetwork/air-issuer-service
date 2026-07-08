import { Module } from '@nestjs/common';

import { DStorageModule } from '../dstorage/dstorage.module';
import { SdJwtVcService } from './services/sd-jwt-vc.service';

@Module({
  imports: [DStorageModule],
  controllers: [],
  providers: [SdJwtVcService],
  exports: [SdJwtVcService],
})
export class SdJwtModule {}
