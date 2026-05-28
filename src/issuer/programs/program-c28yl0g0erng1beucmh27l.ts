import { BaseProgram } from './base-program';

const EXPIRY_SEC = 30 * 24 * 60 * 60; // In Seconds

class Program extends BaseProgram {
  public readonly programId = 'c28yl0g0erng1beucmh27l';
  public readonly schemaId = '01KKX3Q7DEK0GM2TCKMMHA';
  public readonly schemaType = 'mocabasher';
  public readonly schemaUrl = 'https://credential.api.staging.air3.com/dstorage/download/01KKX3Q7DFFWNMD85T17X8';
  public readonly schemaContextUrl = 'https://credential.api.staging.air3.com/dstorage/download/01KKX3Q7DFZN9G1YYB2495';

  generateCredentialData(userId: string) {
    // Fetch the data
    const expiration = Math.floor(Date.now() / 1000) + EXPIRY_SEC;

    return Promise.resolve({
      credentialSubject: {
        bashComment: `I am the great basher ${userId}.`,
        mocaRatings: userId.length,
      },
      expiration,
    });
  }
}

export default new Program();
