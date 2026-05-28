import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  randomBytes,
} from 'crypto';
import { hkdf } from './hkdf';
import { hexStrToBuffer } from './string';

const CIPHER = 'aes-256-gcm';

export type EncryptionPackage = {
  data: string;
  iv: string;
  authTag: string;
  dataEncPublicKeyHex: string;
};

export async function encryptText(text: string, masterPublicKeyHex: string): Promise<EncryptionPackage> {
  const masterPublicKey = createPublicKey({
    key: hexStrToBuffer(masterPublicKeyHex),
    format: 'der',
    type: 'spki',
  });

  const dataEncKey = generateKeyPairSync('x25519');
  const sharedSecret = diffieHellman({
    privateKey: dataEncKey.privateKey,
    publicKey: masterPublicKey,
  });
  const symmetricKey = await hkdf({
    digest: 'sha256',
    info: 'data-enc-aes-256-gcm',
    seedHex: Buffer.from(sharedSecret).toString('hex'),
    length: 32,
  }).then((e) => Buffer.from(e));

  const iv = randomBytes(12);
  const cipher = createCipheriv(CIPHER, symmetricKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  const dataEncPublicKeyHex = dataEncKey.publicKey.export({ format: 'der', type: 'spki' }).toString('hex');

  return {
    data: `0x${encrypted}`,
    iv: `0x${iv.toString('hex')}`,
    authTag: `0x${authTag}`,
    dataEncPublicKeyHex: `0x${dataEncPublicKeyHex}`,
  };
}

export async function decryptText(payload: EncryptionPackage, masterPrivateKeyHex: string): Promise<string> {
  const { data } = payload;

  const dataEncPublicKeyHex = hexStrToBuffer(payload.dataEncPublicKeyHex);
  const iv = hexStrToBuffer(payload.iv);
  const authTag = hexStrToBuffer(payload.authTag);

  const masterPrivateKey = createPrivateKey({
    key: hexStrToBuffer(masterPrivateKeyHex),
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
    digest: 'sha256',
    info: 'data-enc-aes-256-gcm',
    seedHex: Buffer.from(sharedSecret).toString('hex'),
    length: 32,
  }).then((e) => Buffer.from(e));

  const decipher = createDecipheriv(CIPHER, symmetricKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
