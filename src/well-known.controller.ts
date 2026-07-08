import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('.well-known')
export class WellKnownController {
  private readonly issuer = this.configService.getOrThrow<string>('ISSUER_ORIGIN');
  private readonly jwks = JSON.parse(this.configService.getOrThrow<string>('SD_JWT_JWKS'));

  constructor(private readonly configService: ConfigService) {}

  @Get('jwt-vc-issuer')
  getJwtVcIssuer() {
    return {
      issuer: this.issuer,
      jwks: this.jwks,
    };
  }
}
