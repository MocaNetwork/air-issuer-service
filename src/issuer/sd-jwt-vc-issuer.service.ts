import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { decodeJwt } from 'jose';

import { SdJwtVcService } from '../sd-jwt/services/sd-jwt-vc.service';
import { PartnerJwtService } from '../services/partner-jwt.service';
import { CredentialIssuance } from './entities/credential-issuance.entity';

import { encryptText } from '../common/utils/encryption';
import { hexStrToBuffer } from '../common/utils/string';
import { DStorageAPIService } from '../dstorage/services/dstorage-api.service';

import { BaseSchema, schemas } from './sd-jwt-vc-schemas';

@Injectable()
export class SdJwtVcIssuerService {
  private readonly schemaIdMap: { [schemaId: string]: BaseSchema<object> } = {};

  constructor(
    private readonly configService: ConfigService,
    private readonly entityManager: EntityManager,
    private readonly partnerJwtService: PartnerJwtService,
    private readonly dStorageApiService: DStorageAPIService,

    // NOTE: Treat CredentialIssuingService as a separate http service.
    // Intended design is HTTP Interaction. For ease of integration,
    // temporarily exposed the underlying service.
    private readonly sdJwtVcService: SdJwtVcService,
  ) {
    schemas.forEach((e) => {
      console.log(`mapped: ${Object.keys(e)}`);
      this.schemaIdMap[e.schemaId] = e;
    });
  }

  async availableVc(
    holder: { userId: string; holderDID: string; pubKey: string },
    filters?: { schemaId?: string },
  ): Promise<object> {
    const VCs: object[] = [];

    for (const schema of schemas) {
      if (![schema.schemaId, undefined].includes(filters?.schemaId)) {
        continue;
      }

      const claims = await schema.generateCredentialData(holder.userId);
      const payload = JSON.stringify(claims);
      const encryptedData = encryptText(payload, hexStrToBuffer(holder.pubKey), { encoding: 'base64' });

      VCs.push({
        holderDID: holder.holderDID,
        schemaId: schema.schemaId,
        credentialSubject: encryptedData,
      });
    }

    return VCs;
  }

  async issueVc(schemaId: string, holder: { userId: string; holderDID: string; pubKey: string }): Promise<void> {
    const schema = this.schemaIdMap[schemaId];

    if (schema === undefined) throw new NotFoundException(`Invalid Schema: ${schemaId}`);
    await this.entityManager.transactional(async (em) => {
      const credential = await schema.issue(holder.userId, this.sdJwtVcService);
      const encryptedData = await encryptText(credential, hexStrToBuffer(holder.pubKey), {
        encoding: 'base64',
      });
      const decodedJwt = decodeJwt(credential);

      const credentialIssuance = new CredentialIssuance();
      credentialIssuance.holderDid = holder.holderDID;
      credentialIssuance.schemaId = schema.schemaId;
      credentialIssuance.revocationNonce = '1';
      credentialIssuance.createdAt = new Date();
      credentialIssuance.expiresAt = new Date();
      credentialIssuance.dstorageInfo = null;
      credentialIssuance.revokedAt = null;
      await em.persist(credentialIssuance).flush();

      const partnerJwt = await this.partnerJwtService.generateJwt({}, {});
      const dstorageInfo = await this.dStorageApiService.createObject(
        {
          holderDid: holder.holderDID,
          schemaId: schema.schemaId,
          // expiresAt: opts.expiresAt,
          data: encryptedData.encryptedData,
          iv: encryptedData.iv,
          authTag: encryptedData.authTag,
          encryptedKey: encryptedData.dataEncPublicKey,
          externalId: randomUUID(),
        },
        { 'x-partner-auth': partnerJwt },
      );

      credentialIssuance.dstorageInfo = dstorageInfo.data;

      await em.persist(credentialIssuance).flush();
    });
  }
}
