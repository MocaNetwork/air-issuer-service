import { EntityManager, FilterQuery, FindOptions } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, importPKCS8 } from 'jose';

import { CredentialIssuingService } from '../iden3/services/credential-issuing.service';
import { CredentialIssuance } from './entities/credential-issuance.entity';

import schemas from './schemas';
import { BaseSchema } from './schemas/base-schema';

const PARTNER_AUTH_EXPIRY_MS = 15 * 60_000;
const PARTNER_AUTH_EXPIRY_THRESHOLD_MS = 2 * 60_000;

@Injectable()
export class IssuerService {
  private readonly schemaIdMap: { [schemaId: string]: BaseSchema } = {};
  private readonly schemas: BaseSchema[];

  private readonly partnerId: string;
  private partnerPrivateKey: CryptoKey;
  private readonly partnerPrivateKeyDer: string;
  private readonly partnerPrivateKeyAlg: string;
  private readonly partnerPrivateKeyKid: string;
  private partnerAuth: { expiry: Date; jwt: string } = { expiry: new Date(0), jwt: '' };

  constructor(
    private readonly configService: ConfigService,
    private readonly entityManager: EntityManager,

    // NOTE: Treat CredentialIssuingService as a separate http service.
    // Intended design is HTTP Interaction. For ease of integration,
    // temporarily exposed the underlying service.
    private readonly credentialIssuingService: CredentialIssuingService,
  ) {
    this.partnerId = this.configService.getOrThrow<string>('PARTNER_ID');
    this.partnerPrivateKeyDer = this.configService.getOrThrow<string>('PARTNER_PRIVATE_KEY_DER');
    this.partnerPrivateKeyAlg = this.configService.getOrThrow<string>('PARTNER_PRIVATE_KEY_ALG');
    this.partnerPrivateKeyKid = this.configService.getOrThrow<string>('PARTNER_PRIVATE_KEY_KID');

    this.schemas = schemas;
    schemas.forEach((e) => {
      this.schemaIdMap[e.schemaId] = e;
    });
  }

  async onModuleInit() {
    let pkcs8 = '-----BEGIN PRIVATE KEY-----\n';
    pkcs8 += this.partnerPrivateKeyDer;
    pkcs8 += '\n-----END PRIVATE KEY-----';

    this.partnerPrivateKey = await importPKCS8(pkcs8, this.partnerPrivateKeyAlg);
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

  async issueVc(schemaId: string, holder: { userId: string; holderDID: string; pubKey: string }): Promise<object> {
    const schema = this.schemaIdMap[schemaId];

    if (schema === undefined) throw new NotFoundException(`Invalid Schema: ${schemaId}`);

    const issuedVC = await this.entityManager.transactional(async (em) => {
      const credential = await schema.issue(holder.userId, {
        holderDID: holder.holderDID,
        issue: (...args) => this.credentialIssuingService.issue(...args),
      });
      const payload = JSON.stringify(credential);
      const encryptedData = await this.credentialIssuingService.encrypt(payload, holder.pubKey, { encoding: 'base64' });

      const credentialIssuance = new CredentialIssuance();
      credentialIssuance.holderDid = holder.holderDID;
      credentialIssuance.schemaId = schema.schemaId;
      credentialIssuance.revocationNonce = credential.credentialStatus.revocationNonce!.toString();
      credentialIssuance.createdAt = new Date(credential.issuanceDate!);
      credentialIssuance.expiresAt = new Date(credential.expirationDate!);
      credentialIssuance.revokedAt = null;
      await em.persist(credentialIssuance).flush();

      return {
        holderDID: holder.holderDID,
        schemaId: schema.schemaId,
        credential: encryptedData,
      };
    });

    const partnerJwt = await this.generatePartnerJwt();
    await this.credentialIssuingService.dstorageUpload(issuedVC, { partnerJwt });

    return issuedVC;
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
        type: 'bjj',
      };
    });

    return {
      data,
      pagination: { page, limit, total },
    };
  }

  async revocationStatus(nonce: string) {
    const isRevoked = await this.credentialIssuingService.isRevoked(nonce);
    return { isRevoked };
  }

  async revoke(revocationNonce: string): Promise<void> {
    await this.entityManager.transactional(async (em) => {
      const revocation = await this.credentialIssuingService.revoke(revocationNonce);
      await em.nativeUpdate(CredentialIssuance, { revocationNonce }, { revokedAt: revocation.createdAt });
    });
  }

  private async generatePartnerJwt(): Promise<string> {
    const expiryTTL = this.partnerAuth.expiry.getTime() - Date.now();

    if (expiryTTL > PARTNER_AUTH_EXPIRY_THRESHOLD_MS) {
      return this.partnerAuth.jwt;
    }

    // TODO: DStorage `scope` jwt payload
    const expiry = new Date(Date.now() + PARTNER_AUTH_EXPIRY_MS);
    const jwt = await new SignJWT({ partnerId: this.partnerId })
      .setProtectedHeader({ alg: this.partnerPrivateKeyAlg, kid: this.partnerPrivateKeyKid })
      .setExpirationTime(expiry)
      .sign(this.partnerPrivateKey);

    this.partnerAuth = { expiry, jwt };
    return jwt;
  }
}
