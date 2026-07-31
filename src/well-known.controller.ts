import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('.well-known')
export class WellKnownController {
  private readonly issuer = this.configService.getOrThrow<string>('ISSUER_ORIGIN');

  constructor(private readonly configService: ConfigService) {}

  @Get('jwt-vc-issuer')
  getJwtVcIssuer() {
    return {
      issuer: this.issuer,
    };
  }
}
