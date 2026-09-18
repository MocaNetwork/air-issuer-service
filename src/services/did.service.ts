import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JsonWebKey } from 'node:crypto';

@Injectable()
export class DidService {
  private readonly issuerOrigin: string;
  private readonly jwks: { keys: JsonWebKey[] };
  /** Iden3 `did:air` issuer DID, when this partner also issues Iden3 credentials. */
  private readonly iden3IssuerDid: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.issuerOrigin = this.configService.getOrThrow<string>('ISSUER_ORIGIN');
    this.iden3IssuerDid = this.configService.get<string>('IDEN3_ISSUER_DID');

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
    const service = [
      {
        id: `${did}#air-partner-info`,
        type: 'AirPartnerInfoService',
        serviceEndpoint: `${this.issuerOrigin}/.well-known/air-partner-info`,
      },
    ];

    return {
      '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
      id: did,
      ...(this.iden3IssuerDid ? { alsoKnownAs: [this.iden3IssuerDid] } : {}),
      verificationMethod,
      assertionMethod: verificationMethod.map(({ id }) => id),
      service,
    };
  }

  getIssuerDid(): string {
    const url = new URL(this.issuerOrigin.trim().replace(/\/+$/, ''));
    const host = url.port ? `${url.hostname}%3A${url.port}` : url.hostname;
    return `did:web:${host}`;
  }
}
