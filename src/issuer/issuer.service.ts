import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWTHeaderParameters, SignJWT, importPKCS8 } from 'jose';

import { CredentialIssuingService } from '../iden3/services/credential-issuing.service';

import schemas from './schemas';
import { BaseSchema } from './schemas/base-schema';

const PARTNER_AUTH_EXPIRY_MS = 15 * 60_000;
const PARTNER_AUTH_EXPIRY_THRESHOLD_MS = 2 * 60_000;

@Injectable()
export class IssuerService implements OnModuleInit {
  private readonly schemaIdMap: { [schemaId: string]: BaseSchema } = {};
  private readonly schemas: BaseSchema[];

  private readonly partnerId: string;
  private partnerPrivateKey: CryptoKey;
  private readonly partnerPrivateKeyInfo: Record<'der' | 'alg' | 'kid', string>;
  private partnerAuth: { expiry: Date; jwt: string } = { expiry: new Date(0), jwt: '' };

  constructor(
    private readonly configService: ConfigService,

    // NOTE: Treat CredentialIssuingService as a separate http service.
    // Intended design is HTTP Interaction. For ease of integration,
    // temporarily exposed the underlying service.
    private readonly credentialIssuingService: CredentialIssuingService,
  ) {
    this.partnerId = this.configService.getOrThrow<string>('PARTNER_ID');
    this.partnerPrivateKeyInfo = {
      der: this.configService.getOrThrow<string>('PARTNER_PRIVATE_KEY_DER'),
      alg: this.configService.getOrThrow<string>('PARTNER_PRIVATE_KEY_ALG'),
      kid: this.configService.getOrThrow<string>('PARTNER_PRIVATE_KEY_KID'),
    };

    this.schemas = schemas;
    schemas.forEach((e) => {
      this.schemaIdMap[e.schemaId] = e;
    });
  }

  async onModuleInit() {
    let pkcs8 = '-----BEGIN PRIVATE KEY-----\n';
    pkcs8 += this.partnerPrivateKeyInfo.der;
    pkcs8 += '\n-----END PRIVATE KEY-----';

    this.partnerPrivateKey = await importPKCS8(pkcs8, this.partnerPrivateKeyInfo.alg);
  }

  async availableVc(
    holder: { userId: string; holderDID: string; pubKey: string },
    filters?: { schemaId?: string },
  ): Promise<object> {
    const VCs: any[] = [];

    for (const schemas of this.schemas) {
      if (![schemas.schemaId, undefined].includes(filters?.schemaId)) {
        continue;
      }

      const { credentialSubject } = await schemas.generateCredentialData(holder.userId);
      const payload = JSON.stringify(credentialSubject);
      const encryptedData = await this.credentialIssuingService.encrypt(payload, holder.pubKey, { encoding: 'base64' });

      VCs.push({
        holderDID: holder.holderDID,
        schemaId: schemas.schemaId,
        credentialSubject: encryptedData,
      });
    }

    return { data: VCs };
  }

  async issueVc(schemaId: string, holder: { userId: string; holderDID: string; pubKey: string }): Promise<void> {
    const schema = this.schemaIdMap[schemaId];

    if (schema === undefined) throw new NotFoundException(`Invalid Schema: ${schemaId}`);

    const credential = await schema.issue(holder.userId, {
      holderDID: holder.holderDID,
      issue: (opts) => this.credentialIssuingService.issue({ ...opts }),
    });

    const payload = JSON.stringify(credential);
    const encryptedData = await this.credentialIssuingService.encrypt(payload, holder.pubKey, { encoding: 'base64' });

    const partnerJwt = await this.generatePartnerJwt();
    const dstorageInfo = await this.credentialIssuingService.dstorageUpload(
      {
        holderDID: holder.holderDID,
        schemaId: schema.schemaId,
        expiresAt: new Date(credential.expirationDate!).toISOString(),
        credential: encryptedData,
        externalId: credential.id,
      },
      { partnerJwt },
    );
  }

  async credentialStatus(nonce: string) {
    return this.credentialIssuingService.credentialStatus(nonce);
  }

  async issuanceHistory(query: {
    page?: number;
    limit?: number;
    order?: string;
    holderDid?: string;
    schemaId?: string;
    revocationNonce?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;


    return Promise.resolve({
      data: [],
      pagination: { page, limit, total: 0 },
    });
  }

  async revocationStatus(nonce: string) {
    const isRevoked = await this.credentialIssuingService.isRevoked(nonce);
    return { isRevoked };
  }

  async revoke(revocationNonce: string): Promise<void> {
  }

  async generatePartnerJwt(opts?: { email?: string }): Promise<string> {
    const expiryTTL = this.partnerAuth.expiry.getTime() - Date.now();

    if (expiryTTL > PARTNER_AUTH_EXPIRY_THRESHOLD_MS && opts?.email === undefined) {
      return this.partnerAuth.jwt;
    }

    // TODO: DStorage `scope` jwt payload
    const expiry = new Date(Date.now() + PARTNER_AUTH_EXPIRY_MS);
    const headers: JWTHeaderParameters = {
      alg: this.partnerPrivateKeyInfo.alg,
      kid: this.partnerPrivateKeyInfo.kid,
    };
    const jwt = await new SignJWT({ partnerId: this.partnerId, email: opts?.email })
      .setProtectedHeader(headers)
      .setExpirationTime(expiry)
      // .setAudience(aud)
      // .setIssuer(iss)
      .sign(this.partnerPrivateKey);

    this.partnerAuth = { expiry, jwt };
    return jwt;
  }
}
