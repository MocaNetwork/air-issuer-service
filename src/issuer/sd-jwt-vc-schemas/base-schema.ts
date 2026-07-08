import { DisclosureFrame } from '@sd-jwt/core';
import { SdJwtVcPayload } from '@sd-jwt/sd-jwt-vc';
import { SdJwtVcService } from '../../sd-jwt/services/sd-jwt-vc.service';

export abstract class BaseSchema<T> {
  abstract readonly schemaId: string;
  abstract readonly vct: string;
  abstract readonly ['vct#integrity']?: string; // TODO: Dashboard integrity implementation
  abstract readonly disclosureFrame: DisclosureFrame<T & SdJwtVcPayload>;
  abstract readonly expirySec: number;

  async claimableVCs(sub: string): Promise<T> {
    return await this.generateCredentialData(sub);
  }

  async issue(sub: string, sdJwtVcService: SdJwtVcService): Promise<string> {
    const baseClaims = await this.generateCredentialData(sub);
    const claims: T & SdJwtVcPayload = {
      ...baseClaims,
      vct: this.vct,
      sub,
      exp: Math.floor(Date.now() / 1000) + this.expirySec,
    };

    if (this['vct#integrity']) claims['vct#integrity'] = this['vct#integrity'];

    return await sdJwtVcService.issue(claims, this.disclosureFrame);
  }

  abstract generateCredentialData(sub: string): Promise<T>;
}
