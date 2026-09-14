import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import mikroOrmConfig from './mikro-orm.config';

import { DStorageModule } from './dstorage/dstorage.module';
import { HttpModule } from './dynamic-modules/http-module';
import { SdJwtModule } from './sd-jwt/sd-jwt.module';
import { IssuerModule } from './issuer/issuer.module';

import { AppController } from './app.controller';
import { WellKnownController } from './well-known.controller';

import { DidService } from './services/did.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRoot(mikroOrmConfig),

    DStorageModule,
    HttpModule,
    IssuerModule,
    SdJwtModule,
  ],
  controllers: [AppController, WellKnownController],
  providers: [DidService],
})
export class AppModule {}
