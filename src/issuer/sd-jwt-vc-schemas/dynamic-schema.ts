import { DisclosureFrame } from '@sd-jwt/core';
import { BaseSchema } from './base-schema';

type Claim = Record<string, unknown>;

export class DynamicSchema extends BaseSchema<Claim> {
  public readonly ['vct#integrity'] = undefined;
  public readonly schemaId: string;
  public readonly vct: string;
  public readonly disclosureFrame: DisclosureFrame<Claim>;
  public readonly expirySec: number;

  private readonly credentialSubject: Claim;

  constructor(params: {
    schemaId: string;
    vct: string;
    expiration: string;
    credentialSubject: Claim;
    disclosureFrame?: Claim;
  }) {
    super();

    this.schemaId = params.schemaId;
    this.vct = params.vct;
    this.credentialSubject = params.credentialSubject;
    this.expirySec = Math.floor((new Date(params.expiration).getTime() - Date.now()) / 1_000);
    this.disclosureFrame = (params.disclosureFrame ?? {
      _sd: Object.keys(params.credentialSubject),
    }) as unknown as DisclosureFrame<Claim>;
  }

  async generateCredentialData() {
    return Promise.resolve({
      credentialSubject: this.credentialSubject,
      expiration: Math.floor(Date.now() / 1_000) + this.expirySec,
    });
  }
}
