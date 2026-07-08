import { Injectable } from '@nestjs/common';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import Crypto from 'node:crypto';

@Injectable()
export class TestSdJwtService {
  async test() {
    const { privateKey, publicKey } = Crypto.generateKeyPairSync('ed25519');

    const sdjwt = new SDJwtVcInstance({
      signer: async (data) => {
        const sig = Crypto.sign(null, Buffer.from(data), privateKey);
        return Buffer.from(sig).toString('base64url');
      },
      verifier: async (data, sig) => {
        return Crypto.verify(null, Buffer.from(data), publicKey, Buffer.from(sig, 'base64url'));
      },
      signAlg: 'EdDSA',
      hasher: async (data, alg) => {
        return new Uint8Array(
          Crypto.createHash(alg.replace('-', ''))
            .update(data as any)
            .digest(),
        );
      },
      hashAlg: 'sha-256',
      saltGenerator: async () => Crypto.randomBytes(16).toString('base64url'),
    });

    // Issue
    const credential = await sdjwt.issue(
      { firstname: 'John', lastname: 'Doe', ssn: '123-45-6789', vct: 'asdf'  },
      { _sd: ['firstname', 'lastname', 'ssn'] },
    );
    console.log({ credential });

    // Present (disclose only firstname)
    const presentation = await sdjwt.present(credential, { firstname: true });
    console.log({ presentation });

    // Verify
    const verifyResult = await sdjwt.verify(presentation);
    console.log({ verifyResult }); // { firstname: 'John', ... }
  }
}
