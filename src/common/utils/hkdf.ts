import { BinaryLike, hkdf as hkdfNative } from 'node:crypto';
import { hexStrToBuffer } from './string';

export async function hkdf(opts: {
  digest?: string;
  seed: BinaryLike;
  salt?: BinaryLike;
  info: string;
  length?: number;
}) {
  const length = opts.length ?? 32;
  const digest = opts.digest ?? 'sha256';

  const salt: BinaryLike = opts.salt ?? Buffer.alloc(0, 0);
  const info = Buffer.from(opts.info, 'utf-8');

  return await new Promise<ArrayBuffer>((resolve, reject) => {
    hkdfNative(digest, opts.seed, salt, info, length, (err, derivedKey) => {
      if (err) {
        reject(err);
      } else {
        resolve(derivedKey);
      }
    });
  });
}
