import { W3CCredential } from '@mocanetwork/privado-js-sdk';

export type CredentialDocument = W3CCredential & { proof: any };

export type IssuanceHistoryQuery = {
  page?: number;
  limit?: number;
  order?: string;
  holderDid?: string;
  schemaId?: string;
  revocationNonce?: string;
};

export type IssuanceHistoryItem = {
  holderDid: string;
  schemaId: string;
  revocationNonce: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  type: 'bjj';
};

export type IssuanceHistoryResult = {
  data: IssuanceHistoryItem[];
  pagination: { page: number; limit: number; total: number };
};

export abstract class PersistenceService {
  abstract readonly enabled: boolean;

  /** Runs `work` in a DB transaction when enabled; otherwise runs it directly. */
  abstract runInTransaction<T>(work: () => Promise<T>): Promise<T>;

  abstract saveCredential(data: {
    holder: string;
    document: CredentialDocument;
    nonce: string;
    createdAt?: Date;
  }): Promise<void>;

  abstract createIssuance(data: {
    holderDid: string;
    schemaId: string;
    revocationNonce: string;
    createdAt: Date;
    expiresAt: Date;
  }): Promise<void>;

  abstract updateIssuanceDstorageInfo(revocationNonce: string, dstorageInfo: unknown): Promise<void>;

  abstract revoke(nonce: string): Promise<{ createdAt: Date }>;

  abstract isRevoked(nonce: string): Promise<boolean>;

  abstract markIssuanceRevoked(revocationNonce: string, revokedAt: Date): Promise<void>;

  abstract issuanceHistory(query: IssuanceHistoryQuery): Promise<IssuanceHistoryResult>;
}
