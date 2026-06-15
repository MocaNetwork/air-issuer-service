import { defineEntity, p } from '@mikro-orm/postgresql';

export const CredentialIssuanceSchema = defineEntity({
  name: 'CredentialIssuance',
  properties: {
    id: p.bigint().primary(),
    holderDid: p.text().index(),
    schemaId: p.text().index(),
    revocationNonce: p.bigint<'string'>().index(),
    createdAt: p.datetime().defaultRaw('NOW()'),
    expiresAt: p.datetime(),
    revokedAt: p.datetime().nullable(),
  },
});

export class CredentialIssuance extends CredentialIssuanceSchema.class {}

CredentialIssuanceSchema.setClass(CredentialIssuance);
