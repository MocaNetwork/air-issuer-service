import { Injectable, Logger } from '@nestjs/common';
import {
  CredentialDocument,
  IssuanceHistoryQuery,
  IssuanceHistoryResult,
  PersistenceService,
} from './persistence.service';

@Injectable()
export class NoopPersistenceService extends PersistenceService {
  private readonly logger = new Logger(NoopPersistenceService.name);
  readonly enabled = false;

  constructor() {
    super();
    this.logger.warn('Database persistence disabled (ENABLE_DATABASE=false)');
  }

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }

  async saveCredential(_data: {
    holder: string;
    document: CredentialDocument;
    nonce: string;
    createdAt?: Date;
  }): Promise<void> {}

  async createIssuance(_data: {
    holderDid: string;
    schemaId: string;
    revocationNonce: string;
    createdAt: Date;
    expiresAt: Date;
  }): Promise<void> {}

  async updateIssuanceDstorageInfo(_revocationNonce: string, _dstorageInfo: unknown): Promise<void> {}

  async revoke(_nonce: string): Promise<{ createdAt: Date }> {
    return { createdAt: new Date() };
  }

  async isRevoked(_nonce: string): Promise<boolean> {
    return false;
  }

  async markIssuanceRevoked(_revocationNonce: string, _revokedAt: Date): Promise<void> {}

  async issuanceHistory(query: IssuanceHistoryQuery): Promise<IssuanceHistoryResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    return {
      data: [],
      pagination: { page, limit, total: 0 },
    };
  }
}
