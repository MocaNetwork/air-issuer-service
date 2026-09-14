import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DidService } from './services/did.service';

@Controller('.well-known')
export class WellKnownController {
  private readonly issuer = this.configService.getOrThrow<string>('ISSUER_ORIGIN');
  private readonly jwks: { keys: JsonWebKey[] };

  constructor(
    private readonly configService: ConfigService,
    private readonly didService: DidService,
  ) {
    let jwksString: string | undefined = this.configService.get<string>('PARTNER_JWKS');
    jwksString ||= this.configService.get<string>('SD_JWT_JWKS');
    jwksString ||= this.configService.getOrThrow<string>('PARTNER_JWKS');
    this.jwks = JSON.parse(jwksString) as { keys: JsonWebKey[] };
  }

  @Get('did.json')
  @Header('content-type', 'application/did+ld+json')
  getDidDocument() {
    return this.didService.getDidDocument();
  }

  @Get('jwt-vc-issuer')
  getJwtVcIssuer() {
    return {
      issuer: this.issuer,
      jwks: this.jwks,
    };
  }
}
