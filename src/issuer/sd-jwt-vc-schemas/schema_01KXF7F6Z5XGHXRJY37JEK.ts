import { DisclosureFrame } from '@sd-jwt/core';
import { BaseSchema } from './base-schema';

type Claim = {
  firstName: string;
  lastName: string;
};

class Schema_01KXF7F6Z5XGHXRJY37JEK extends BaseSchema<Claim> {
  public readonly ['vct#integrity'] = undefined;
  public readonly schemaId = '01KXF7F6Z5XGHXRJY37JEK';
  public readonly vct = undefined;
  public readonly disclosureFrame: DisclosureFrame<Claim> = {
    _sd: ['firstName', 'lastName'],
  };
  public readonly expirySec = 30 * 24 * 60 * 60; // 30 Days In Seconds

  async generateCredentialData(userId: string) {
    const expiration = Math.floor(Date.now() / 1000) + this.expirySec;

    return Promise.resolve({
      credentialSubject: {
        firstName: `first:${userId}`,
        lastName: `last:${userId}`,
      },
      expiration,
    });
  }
}

export default new Schema_01KXF7F6Z5XGHXRJY37JEK();
