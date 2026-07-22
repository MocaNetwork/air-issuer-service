import { EntityManager, FilterQuery, FindOptions } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Credential } from '../iden3/entities/credential.entity';
import { Revocation } from '../iden3/entities/revocation.entity';
import { CredentialIssuance } from '../issuer/entities/credential-issuance.entity';
import {
  CredentialDocument,
  IssuanceHistoryQuery,
  IssuanceHistoryResult,
  PersistenceService,
} from './persistence.service';

@Injectable()
export class DbPersistenceService extends PersistenceService {
  readonly enabled = true;
  private readonly transactionEm = new AsyncLocalStorage<EntityManager>();

  constructor(private readonly entityManager: EntityManager) {
    super();
  }

  private em(): EntityManager {
    return this.transactionEm.getStore() ?? this.entityManager;
  }

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.entityManager.transactional(async (tem) => this.transactionEm.run(tem, work));
  }

  async saveCredential(data: {
    holder: string;
    document: CredentialDocument;
    nonce: string;
    createdAt?: Date;
  }): Promise<void> {
    const em = this.em();
    const credentialRecord = new Credential();
    credentialRecord.holder = data.holder;
    credentialRecord.document = data.document;
    credentialRecord.nonce = data.nonce;
    credentialRecord.createdAt = data.createdAt ?? new Date();
    await em.persist(credentialRecord).flush();
  }

  async createIssuance(data: {
    holderDid: string;
    schemaId: string;
    revocationNonce: string;
    createdAt: Date;
    expiresAt: Date;
  }): Promise<void> {
    const em = this.em();
    const credentialIssuance = new CredentialIssuance();
    credentialIssuance.holderDid = data.holderDid;
    credentialIssuance.schemaId = data.schemaId;
    credentialIssuance.revocationNonce = data.revocationNonce;
    credentialIssuance.createdAt = data.createdAt;
    credentialIssuance.expiresAt = data.expiresAt;
    credentialIssuance.dstorageInfo = null;
    credentialIssuance.revokedAt = null;
    await em.persist(credentialIssuance).flush();
  }

  async updateIssuanceDstorageInfo(revocationNonce: string, dstorageInfo: unknown): Promise<void> {
    await this.em().nativeUpdate(CredentialIssuance, { revocationNonce }, { dstorageInfo });
  }

  async revoke(nonce: string): Promise<{ createdAt: Date }> {
    const em = this.em();
    const existing = await em.findOne(Revocation, { nonce });
    if (existing) return { createdAt: existing.createdAt };

    const revocation = new Revocation();
    revocation.nonce = nonce;
    revocation.createdAt = new Date();
    await em.persist(revocation).flush();
    return { createdAt: revocation.createdAt };
  }

  async isRevoked(nonce: string): Promise<boolean> {
    return (await this.em().count(Revocation, { nonce })) > 0;
  }

  async markIssuanceRevoked(revocationNonce: string, revokedAt: Date): Promise<void> {
    await this.em().nativeUpdate(CredentialIssuance, { revocationNonce }, { revokedAt });
  }

  async issuanceHistory(query: IssuanceHistoryQuery): Promise<IssuanceHistoryResult> {
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

    const [records, total] = await this.em().findAndCount(CredentialIssuance, filters, findOptions);
    const data = records.map((e) => ({
      holderDid: e.holderDid,
      schemaId: e.schemaId,
      revocationNonce: e.revocationNonce.toString(),
      createdAt: e.createdAt.toISOString(),
      expiresAt: e.expiresAt.toISOString(),
      revokedAt: e.revokedAt?.toISOString() ?? null,
      type: 'bjj' as const,
    }));

    return {
      data,
      pagination: { page, limit, total },
    };
  }
}
