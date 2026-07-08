import { BaseSchema } from './base-schema';

type Claim = {
  firstName: string;
  lastName: string;
};

class Schema_01KXF7F6Z5XGHXRJY37JEK extends BaseSchema<Claim> {
 public readonly ['vct#integrity'] = undefined;
 public readonly schemaId = '01KXF7F6Z5XGHXRJY37JEK';
 public readonly vct = 'moca-kyc';
 public readonly disclosureFrame = {};
 public readonly expirySec = 30 * 24 * 60 * 60; // 30 Days In Seconds

  async generateCredentialData(sub: string) {
    return Promise.resolve({
      firstName: `first_${sub}`,
      lastName: `last_${sub}`,
    });
  }
}

export default new Schema_01KXF7F6Z5XGHXRJY37JEK();
