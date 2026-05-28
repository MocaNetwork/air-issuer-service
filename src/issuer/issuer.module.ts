import { Module } from '@nestjs/common';
import { Iden3Module } from '../iden3/iden3.module';
import { IssuerService } from './issuer.service';

@Module({
  imports: [Iden3Module],
  controllers: [],
  providers: [IssuerService],
  exports: [IssuerService],
})
export class IssuerModule {}
