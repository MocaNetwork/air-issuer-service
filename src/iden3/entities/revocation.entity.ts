import { defineEntity, p } from '@mikro-orm/postgresql';

export const RevocationSchema = defineEntity({
  name: 'Revocation',
  properties: {
    nonce: p.bigint<'string'>().primary().autoincrement(false),
    createdAt: p.datetime().defaultRaw('NOW()'),
  },
});

export class Revocation extends RevocationSchema.class {}

RevocationSchema.setClass(Revocation);
