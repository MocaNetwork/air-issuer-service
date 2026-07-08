import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { digest, generateSalt } from '@owf/crypto';
import { DisclosureFrame, HashAlgorithm } from '@sd-jwt/core';
import { SDJwtVcInstance, SdJwtVcPayload } from '@sd-jwt/sd-jwt-vc';
import { base64url, CompactJWSHeaderParameters, FlattenedSign, importPKCS8 } from 'jose';
import { randomBytes, randomUUID } from 'node:crypto';

@Injectable()
export class SdJwtVcService implements OnModuleInit {
  private readonly issuerOrigin = this.configService.getOrThrow<string>('ISSUER_ORIGIN');
  private readonly partnerId = this.configService.getOrThrow<string>('PARTNER_ID');
  private readonly partnerPrivateKeyAlg = this.configService.getOrThrow<string>('PARTNER_PRIVATE_KEY_ALG');
  private readonly partnerPrivateKeyDer = this.configService.getOrThrow<string>('PARTNER_PRIVATE_KEY_DER');
  private readonly partnerPrivateKeyKid = this.configService.getOrThrow<string>('PARTNER_PRIVATE_KEY_KID');
  private readonly sdJwtHashAlg = this.configService.getOrThrow<HashAlgorithm>('SD_JWT_HASH_ALG');

  private sdJwtVcInstance: SDJwtVcInstance;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    let pkcs8 = '-----BEGIN PRIVATE KEY-----\n';
    pkcs8 += this.partnerPrivateKeyDer;
    pkcs8 += '\n-----END PRIVATE KEY-----';
    const privateKey = await importPKCS8(pkcs8, this.partnerPrivateKeyAlg);

    this.sdJwtVcInstance = new SDJwtVcInstance({
      hashAlg: this.sdJwtHashAlg,
      signAlg: this.partnerPrivateKeyAlg,
      hasher: digest,
      signer: (data) => this.sign(data, privateKey),
      saltGenerator: generateSalt,
    });
  }

  async issue<Payload extends SdJwtVcPayload>(basePayload: Payload, disclosureFrame?: DisclosureFrame<Payload>) {
    const header: object = { kid: this.partnerPrivateKeyKid };
    const nonce = BigInt(`0x${randomBytes(8).toString('hex')}`).toString();
    const payload: Payload = {
      ...basePayload,
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuerOrigin,
      id: `urn:${randomUUID()}`,
      nonce,
      // cnf: // TODO: flow for cnf
      // status: // TODO: draft-ietf-oauth-status-list-21
    };

    return this.sdJwtVcInstance.issue<Payload & SdJwtVcPayload>(payload, disclosureFrame, { header });
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
