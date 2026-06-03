import { MerklizedRootPosition, W3CCredential } from '@mocanetwork/privado-js-sdk';

export abstract class BaseSchema {
  schemaId: string;
  schemaType: string;
  schemaUrl: string;
  schemaContextUrl: string;

  async claimableVCs(userId: string): Promise<any> {
    return await this.generateCredentialData(userId);
  }

  async issue(
    userId: string,
    opts: {
      holderDID: string;
      issue: (opts: {
        credentialSchema: string;
        type: string;
        merklizedRootPosition: MerklizedRootPosition;
        credentialSubject: { id: string } & any;
        expiration: number;
      }) => Promise<W3CCredential>;
    },
  ): Promise<W3CCredential> {
    const data = await this.generateCredentialData(userId);

    return await opts.issue({
      merklizedRootPosition: MerklizedRootPosition.Value,
      credentialSchema: this.schemaUrl,
      type: this.schemaType,
      credentialSubject: {
        id: opts.holderDID,
        ...data.credentialSubject,
      },
      expiration: data.expiration,
    });
  }

  abstract generateCredentialData(userId: string): Promise<{ credentialSubject: object; expiration: number }>;
}
