import { defineEntity, p } from '@mikro-orm/postgresql';

export const IssuanceHistorySchema = defineEntity({
  name: 'IssuanceHistory',
  properties: {
    id: p.bigint().primary(),
    holder: p.text().index(),
    schemaId: p.text().index(),
    revocationNonce: p.bigint<'string'>().index(),
    createdAt: p.datetime().defaultRaw('NOW()'),
    expiresAt: p.datetime(),
    revokedAt: p.datetime().nullable(),
  },
});

export class IssuanceHistory extends IssuanceHistorySchema.class {}

IssuanceHistorySchema.setClass(IssuanceHistory);
