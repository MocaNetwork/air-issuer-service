import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { digest, generateSalt } from '@owf/crypto';
import { DisclosureFrame, HashAlgorithm } from '@sd-jwt/core';
import { SDJwtVcInstance, SdJwtVcPayload } from '@sd-jwt/sd-jwt-vc';
import { base64url, CompactJWSHeaderParameters, FlattenedSign, importPKCS8 } from 'jose';
import { randomBytes, randomUUID } from 'node:crypto';

import { SdJwtVc } from '../entities/sd-jwt-vc.entity';

const PARTNER_PRIVATE_KEY_ALG = 'ES256';
const SD_JWT_HASH_ALG: HashAlgorithm = 'sha-256';

@Injectable()
export class SdJwtVcService implements OnModuleInit {
  private readonly issuerOrigin = this.configService.getOrThrow<string>('ISSUER_ORIGIN');
  private readonly partnerId = this.configService.getOrThrow<string>('PARTNER_ID');
  private readonly partnerPrivateKeyDer = this.configService.getOrThrow<string>('PARTNER_PRIVATE_KEY_DER');
  private readonly partnerPrivateKeyKid = this.configService.getOrThrow<string>('PARTNER_PRIVATE_KEY_KID');

  private sdJwtVcInstance!: SDJwtVcInstance;

  constructor(
    private readonly configService: ConfigService,
    private readonly entityManager: EntityManager,
  ) {}

  async onModuleInit() {
    let pkcs8 = '-----BEGIN PRIVATE KEY-----\n';
    pkcs8 += this.partnerPrivateKeyDer;
    pkcs8 += '\n-----END PRIVATE KEY-----';
    const privateKey = await importPKCS8(pkcs8, PARTNER_PRIVATE_KEY_ALG);

    this.sdJwtVcInstance = new SDJwtVcInstance({
      hashAlg: SD_JWT_HASH_ALG,
      signAlg: PARTNER_PRIVATE_KEY_ALG,
      hasher: digest,
      signer: (data) => this.sign(data, privateKey),
      saltGenerator: generateSalt,
    });
  }

  async issue<Payload extends SdJwtVcPayload>(
    basePayload: Payload,
    disclosureFrame?: DisclosureFrame<Payload>,
    opts?: { em?: EntityManager },
  ) {
    const em = opts?.em ?? this.entityManager;

    const header: object = { kid: this.partnerPrivateKeyKid };
    const id = `urn:${randomUUID()}`;
    const nonce = BigInt(`0x${randomBytes(8).toString('hex')}`).toString();
    const iat = Math.floor(Date.now() / 1000);

    const payload: Payload = {
      ...basePayload,
      id: basePayload.id ?? id,
      nonce: basePayload.nonce ?? nonce,
      iat: basePayload.iat ?? iat,

      iss: this.issuerOrigin,
      // cnf: // TODO: flow for cnf
      // status: // TODO: draft-ietf-oauth-status-list-21
    };

    const jwt = await this.sdJwtVcInstance.issue(payload, disclosureFrame, { header });

    const sdJwtVc = new SdJwtVc();
    sdJwtVc.holder = payload.sub!;
    sdJwtVc.jwt = jwt;
    sdJwtVc.nonce = payload.nonce as string;
    sdJwtVc.revoked = false;
    sdJwtVc.createdAt = new Date(payload.iat! * 1_000);

    await em.persist(sdJwtVc).flush();

    return jwt;
  }

  private async sign(data: string, privateKey: CryptoKey): Promise<string> {
    const [headerb64, payloadb64] = data.split('.');
    const header = Buffer.from(headerb64, 'base64url').toString('utf-8');
    const protectedHeader = <CompactJWSHeaderParameters>JSON.parse(header);
    const payload = base64url.decode(payloadb64);

    const flattedSign = new FlattenedSign(payload);
    flattedSign.setProtectedHeader(protectedHeader);
    const { signature } = await flattedSign.sign(privateKey);

    return signature;
  }
}
