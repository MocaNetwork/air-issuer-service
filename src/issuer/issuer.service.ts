import { EntityManager, FilterQuery, FindOptions, raw } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { CredentialIssuance } from './entities/credential-issuance.entity';

import { V2AuthService } from '../air-api/service/v2-auth.service';
import { encryptText } from '../common/utils/encryption';
import { hexStrToBuffer } from '../common/utils/string';
import { DStorageAPIService } from '../dstorage/services/dstorage-api.service';
import { SdJwtVcService } from '../sd-jwt/services/sd-jwt-vc.service';
import { PartnerJwtService } from '../services/partner-jwt.service';

import SdJwtVCSchemas from './sd-jwt-vc-schemas';
import { BaseSchema as SdJwtVCBaseSchema } from './sd-jwt-vc-schemas/base-schema';
import { DynamicSchema } from './sd-jwt-vc-schemas/dynamic-schema';

import { ProofType } from './enums/proof-type.enum';

@Injectable()
export class IssuerService {
  private readonly schemas: {
    [ProofType.SD_JWT_VC]: SdJwtVCBaseSchema<any>[];
  };
  private readonly schemaIdMap: {
    [ProofType.SD_JWT_VC]: { [schemaId: string]: SdJwtVCBaseSchema<any> };
  };

  constructor(
    private readonly entityManager: EntityManager,
    private readonly dStorageApiService: DStorageAPIService,
    private readonly partnerJwtService: PartnerJwtService,
    private readonly v2AuthService: V2AuthService,
    private readonly sdJwtVcService: SdJwtVcService,
  ) {
    this.schemas = {
      [ProofType.SD_JWT_VC]: SdJwtVCSchemas,
    };

    this.schemaIdMap = {
      [ProofType.SD_JWT_VC]: {},
    };

    SdJwtVCSchemas.forEach((e) => {
      this.schemaIdMap[ProofType.SD_JWT_VC][e.schemaId] = e;
    });
  }

  async availableVc(
    holder: { userId: string; holderDID: string; pubKey: string },
    filters?: { schemaId?: string; proofType?: ProofType },
  ): Promise<object> {
    const VCs: any[] = [];

    for (const proofType of Object.keys(this.schemas) as ProofType[]) {
      if (filters?.proofType !== undefined && filters?.proofType !== proofType) {
        continue;
      }
      for (const schema of this.schemas[proofType]) {
        if (![schema.schemaId, undefined].includes(filters?.schemaId)) {
          continue;
        }

        const { credentialSubject } = await schema.generateCredentialData(holder.userId);
        const payload = JSON.stringify(credentialSubject);
        const encryptedData = await encryptText(payload, hexStrToBuffer(holder.pubKey), { encoding: 'base64' });

        VCs.push({
          holderDID: holder.holderDID,
          schemaId: schema.schemaId,
          credentialSubject: encryptedData,
          proofType,
        });
      }
    }

    return { data: VCs };
  }

  async issueVc(
    schemaId: string,
    holder: {
      userId: string;
      holderDID: string;
      encryptionKey: string;
      signingKey?: { jwk: JsonWebKey };
    },
    proofType?: ProofType,
  ): Promise<void> {
    proofType ??= ProofType.SD_JWT_VC;

    await this.entityManager.transactional(async (em) => {
      const issued = await this.issueSdJwtVc(schemaId, holder);

      await this.storeCredential(em, issued, {
        holderDID: holder.holderDID,
        encryptionKey: holder.encryptionKey,
        schemaId,
        proofType,
      });
    });
  }

  async adminIssueVc(params: {
    userId: string;
    schemaId: string;
    expiration: string;
    vct: string;
    credentialSubject: Record<string, unknown>;
    disclosureFrame?: Record<string, unknown>;
  }): Promise<void> {
    const holder = await this.resolveHolder(params.userId);
    const schema = new DynamicSchema(params);

    await this.entityManager.transactional(async (em) => {
      const issued = await schema.issue(params.userId, {
        holderDID: holder.holderDID,
        issuingService: this.sdJwtVcService,
        cnf: holder.signingKey,
        em,
      });

      await this.storeCredential(em, issued, {
        holderDID: holder.holderDID,
        encryptionKey: holder.encryptionKey,
        schemaId: params.schemaId,
        proofType: ProofType.SD_JWT_VC,
      });
    });
  }

  private async resolveHolder(email: string) {
    const partnerJwt = await this.partnerJwtService.generateJwt({ email }, {});
    const identity = await this.v2AuthService.initializeUser({ partnerJwt }).then((e) => e.data);

    if (!identity.did || !identity.publicKey) {
      throw new UnprocessableEntityException(`Unable to resolve user: ${email}`);
    }

    return {
      holderDID: identity.did,
      encryptionKey: identity.publicKey,
      signingKey: identity.signingKey ?? undefined,
    };
  }

  private async storeCredential(
    em: EntityManager,
    issued: { id: string; credentialIssuance: CredentialIssuance; credential: string | object },
    target: { holderDID: string; encryptionKey: string; schemaId: string; proofType: ProofType },
  ) {
    const { credential, credentialIssuance, id: credentialId } = issued;

    const payload = JSON.stringify(credential);
    const encryptedData = await encryptText(payload, hexStrToBuffer(target.encryptionKey), { encoding: 'base64' });

    await em.persist(credentialIssuance).flush();

    const partnerJwt = await this.partnerJwtService.generateJwt({}, {});
    const dstorageInfo = await this.dStorageApiService.createObject(
      {
        holderDid: target.holderDID,
        proofType: target.proofType,
        schemaId: target.schemaId,
        expiresAt: credentialIssuance.expiresAt.toISOString(),
        data: encryptedData.encryptedData,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
        encryptedKey: encryptedData.dataEncPublicKey,
        externalId: credentialId,
      },
      { 'x-partner-auth': partnerJwt },
    );
    credentialIssuance.dstorageInfo = dstorageInfo.data;

    await em.persist(credentialIssuance).flush();
  }

  private async issueSdJwtVc(
    schemaId: string,
    holder: { userId: string; holderDID: string; signingKey?: { jwk: JsonWebKey } },
  ) {
    const schema = this.schemaIdMap[ProofType.SD_JWT_VC][schemaId];
    if (schema === undefined) throw new NotFoundException(`Invalid Schema: ${schemaId}`);

    return await schema.issue(holder.userId, {
      holderDID: holder.holderDID,
      issuingService: this.sdJwtVcService,
      cnf: holder.signingKey,
    });
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
    const [orderKey, orderDirection] = (query.order ?? 'id_asc').split(/_(?=asc|desc$)/);

    const filters: FilterQuery<NoInfer<CredentialIssuance>> = {};

    if (query.holderDid !== undefined) filters.holderDid = query.holderDid;
    if (query.schemaId !== undefined) filters.schemaId = query.schemaId;
    if (query.revocationNonce !== undefined) filters.revocationNonce = query.revocationNonce;

    const findOptions: FindOptions<CredentialIssuance> = {
      limit,
      offset: (page - 1) * limit,
      orderBy: { [orderKey]: orderDirection },
    };

    const [records, total] = await this.entityManager.findAndCount(CredentialIssuance, filters, findOptions);
    const data = records.map((e) => {
      return {
        holderDid: e.holderDid,
        schemaId: e.schemaId,
        revocationNonce: e.revocationNonce.toString(),
        createdAt: e.createdAt.toISOString(),
        expiresAt: e.expiresAt.toISOString(),
        revokedAt: e.revokedAt?.toISOString() ?? null,
        type: e.type ?? null,
      };
    });

    return {
      data,
      pagination: { page, limit, total },
    };
  }

  async revocationStatus(nonce: string) {
    const isRevoked = await this.sdJwtVcService.isRevoked(nonce);
    return { isRevoked };
  }

  async revoke(revocationNonce: string): Promise<void> {
    await this.entityManager.transactional(async (em) => {
      await this.sdJwtVcService.revoke(revocationNonce);
      await em.nativeUpdate(CredentialIssuance, { revocationNonce }, { revokedAt: raw('NOW()') });
    });
  }
}
