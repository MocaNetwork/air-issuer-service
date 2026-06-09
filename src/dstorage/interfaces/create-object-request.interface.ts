export interface CreateObjectRequestHeader {
  ['x-partner-auth']: string; // Partner JWT (JWKS)
  ['idempotency-key']?: string;
}

export interface CreateObjectRequestBody {
  holderDid: string;

  schemaId: string;

  /**
   * Base64 Encoded
   */
  data: string;

  /**
   * Base64 Encoded
   */
  iv: string;

  /**
   * Base64 Encoded
   */
  authTag: string;

  /**
   * Base64 Encoded
   */
  encryptedKey: string;
}

export interface CreateObjectResponseBody {
  storagePath: string; // TODO: Store?

  state: string;

  envelopeVersion: string;

  /**
   * ISO8601
   */
  createdAt: string;
}
