import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  KeyObject,
  randomBytes,
} from 'crypto';
import { hkdf } from './hkdf';
import { hexStrToBuffer } from './string';

const CIPHER = 'aes-256-gcm';
const DIGEST = 'sha256';
const HKDF_INFO = 'data-enc-aes-256-gcm';

export type EncryptionBufferPackage = {
  encryptedData: Buffer<ArrayBuffer>;
  iv: Buffer<ArrayBuffer>;
  authTag: Buffer<ArrayBuffer>;
  publicKey: Buffer<ArrayBuffer>;
};

/**
 * @param publicKey createPublicKey({ key: publicKey, format: 'der', type: 'spki' })
 */
export async function encrypt(data: Buffer<ArrayBuffer>, publicKey: KeyObject): Promise<EncryptionBufferPackage> {
  const dataEncKey = generateKeyPairSync('x25519');
  const sharedSecret = diffieHellman({
    privateKey: dataEncKey.privateKey,
    publicKey,
  });
  const symmetricKey = await hkdf({
    digest: DIGEST,
    info: HKDF_INFO,
    seed: Buffer.from(sharedSecret),
    length: 32,
  }).then((e) => Buffer.from(e));

  const iv = randomBytes(12);
  const cipher = createCipheriv(CIPHER, symmetricKey, iv);

  const encryptedDataP1 = cipher.update(data);
  const encryptedDataP2 = cipher.final();
  const encryptedData = Buffer.concat([encryptedDataP1, encryptedDataP2]);

  const authTag = cipher.getAuthTag();
  const dataEncPublicKey = dataEncKey.publicKey.export({ format: 'der', type: 'spki' }).buffer;

  return {
    encryptedData,
    iv,
    authTag,
    publicKey: Buffer.from(dataEncPublicKey),
  };
}

/**
 *  @param privateKey createPrivateKey({ key: masterPrivateKeyRaw, format: 'der', type: 'pkcs8' });
 */

export async function decrypt(payload: EncryptionBufferPackage, privateKey: KeyObject): Promise<Buffer<ArrayBuffer>> {
  const { encryptedData, iv, authTag, publicKey } = payload;

  const dataEncPublicKey = createPublicKey({
    key: publicKey,
    format: 'der',
    type: 'spki',
  });

  const sharedSecret = diffieHellman({
    privateKey,
    publicKey: dataEncPublicKey,
  });
  const symmetricKey = await hkdf({
    digest: DIGEST,
    info: HKDF_INFO,
    seed: Buffer.from(sharedSecret),
    length: 32,
  }).then((e) => Buffer.from(e));

  const decipher = createDecipheriv(CIPHER, symmetricKey, iv);
  decipher.setAuthTag(authTag);

  const decryptedP1 = decipher.update(encryptedData);
  const decryptedP2 = decipher.final();

  return Buffer.concat([decryptedP1, decryptedP2]);
}

export type EncryptionPackage = {
  encryptedData: string;
  iv: string;
  authTag: string;
  dataEncPublicKey: string;
};

export async function encryptText(
  text: string,
  masterPublicKeyRaw: Buffer<ArrayBuffer>,
  opts?: { encoding: 'hex' | 'base64' },
): Promise<EncryptionPackage> {
  const encoding = opts?.encoding ?? 'hex';
  const masterPublicKey = createPublicKey({
    key: masterPublicKeyRaw,
    format: 'der',
    type: 'spki',
  });

  const dataEncKey = generateKeyPairSync('x25519');
  const sharedSecret = diffieHellman({
    privateKey: dataEncKey.privateKey,
    publicKey: masterPublicKey,
  });
  const symmetricKey = await hkdf({
    digest: DIGEST,
    info: HKDF_INFO,
    seed: Buffer.from(sharedSecret),
    length: 32,
  }).then((e) => Buffer.from(e));

  const iv = randomBytes(12);
  const cipher = createCipheriv(CIPHER, symmetricKey, iv);
  let encryptedData = cipher.update(text, 'utf8', encoding);
  encryptedData += cipher.final(encoding);

  const authTag = cipher.getAuthTag().toString(encoding);
  const dataEncPublicKey = dataEncKey.publicKey.export({ format: 'der', type: 'spki' }).toString(encoding);

  return {
    encryptedData,
    iv: iv.toString(encoding),
    authTag,
    dataEncPublicKey,
  };
}

export async function decryptText(
  payload: EncryptionPackage,
  masterPrivateKeyRaw: Buffer<ArrayBuffer>,
): Promise<string> {
  const { encryptedData } = payload;

  const dataEncPublicKeyHex = hexStrToBuffer(payload.dataEncPublicKey);
  const iv = hexStrToBuffer(payload.iv);
  const authTag = hexStrToBuffer(payload.authTag);

  const masterPrivateKey = createPrivateKey({
    key: masterPrivateKeyRaw,
    format: 'der',
    type: 'pkcs8',
  });

  const dataEncPublicKey = createPublicKey({
    key: dataEncPublicKeyHex,
    format: 'der',
    type: 'spki',
  });

  const sharedSecret = diffieHellman({
    privateKey: masterPrivateKey,
    publicKey: dataEncPublicKey,
  });
  const symmetricKey = await hkdf({
    digest: DIGEST,
    info: HKDF_INFO,
    seed: Buffer.from(sharedSecret),
    length: 32,
  }).then((e) => Buffer.from(e));

  const decipher = createDecipheriv(CIPHER, symmetricKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
