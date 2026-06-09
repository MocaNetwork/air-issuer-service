import { Module } from '@nestjs/common';
import { DStorageAPIService } from './services/dstorage-api.service';

@Module({
  imports: [],
  controllers: [],
  providers: [DStorageAPIService],
  exports: [DStorageAPIService],
})
export class DStorageModule {}
