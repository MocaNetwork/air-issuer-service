import { defineEntity, p } from '@mikro-orm/postgresql';

export const CredentialIssuanceSchema = defineEntity({
  name: 'CredentialIssuance',
  properties: {
    id: p.bigint().primary(),
    holderDid: p.text().index(),
    schemaId: p.text().index(),
    /** Credential / dstorage idempotency key. Reused when subject claims are unchanged. */
    externalId: p.text().nullable().index(),
    /** sha256 of canonical credentialSubject claims (not expiration or ids). */
    subjectHash: p.text().nullable(),
    dstorageInfo: p.json().nullable(),
    revocationNonce: p.bigint<'string'>().index(),
    createdAt: p.datetime().defaultRaw('NOW()'),
    expiresAt: p.datetime(),
    revokedAt: p.datetime().nullable(),
  },
});

export class CredentialIssuance extends CredentialIssuanceSchema.class {}

CredentialIssuanceSchema.setClass(CredentialIssuance);
