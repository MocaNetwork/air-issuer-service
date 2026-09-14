import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JsonWebKey } from 'node:crypto';

@Injectable()
export class DidService {
  private readonly issuerOrigin: string;
  private readonly jwks: { keys: JsonWebKey[] };

  constructor(private readonly configService: ConfigService) {
    this.issuerOrigin = this.configService.getOrThrow<string>('ISSUER_ORIGIN');

    let jwksString: string | undefined = this.configService.get<string>('PARTNER_JWKS');
    jwksString ||= this.configService.get<string>('SD_JWT_JWKS');
    jwksString ||= this.configService.getOrThrow<string>('PARTNER_JWKS');
    this.jwks = JSON.parse(jwksString) as { keys: JsonWebKey[] };
  }

  getDidDocument() {
    const did = this.getIssuerDid();
    const verificationMethod = this.jwks.keys.map((jwk, index) => {
      let keyId = jwk.kid as string | undefined;
      keyId ??= `key-${index}`;

      return {
        id: `${did}#${keyId}`,
        type: 'JsonWebKey2020',
        controller: did,
        publicKeyJwk: jwk,
      };
    });

    return {
      '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
      id: did,
      verificationMethod,
      assertionMethod: verificationMethod.map(({ id }) => id),
    };
  }

  getIssuerDid(): string {
    const url = new URL(this.issuerOrigin.trim().replace(/\/+$/, ''));
    const host = url.port ? `${url.hostname}%3A${url.port}` : url.hostname;
    return `did:web:${host}`;
  }
}
