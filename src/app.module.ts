import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DStorageModule } from './dstorage/dstorage.module';
import { HttpModule } from './dynamic-modules/http-module';
import { Iden3Module } from './iden3/iden3.module';
import { IssuerModule } from './issuer/issuer.module';
import { PersistenceModule } from './persistence/persistence.module';

import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PersistenceModule.register(),

    DStorageModule,
    HttpModule,
    IssuerModule,
    Iden3Module,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
