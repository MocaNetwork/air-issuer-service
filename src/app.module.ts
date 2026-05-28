import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import mikroOrmConfig from './mikro-orm.config';

import { HttpModule } from './dynamic-modules/http-module';
import { Iden3Module } from './iden3/iden3.module';
import { IssuerModule } from './issuer/issuer.module';

import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRoot(mikroOrmConfig),

    HttpModule,
    IssuerModule,
    Iden3Module,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
