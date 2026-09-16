import { Module } from '@nestjs/common';
import { V2AuthService } from './service/v2-auth.service';

@Module({
  imports: [],
  controllers: [],
  providers: [V2AuthService],
  exports: [V2AuthService],
})
export class AirApiModule {}
