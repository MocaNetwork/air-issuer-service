import { JWTHeaderParameters, SignJWT } from 'jose';

export const DEFAULT_EXPIRY = new Date(15 * 60_000);

export async function generatePartnerJwt(
  claims: { partnerId: string; email?: string; scope?: string },
  opts: {
    aud?: string;
    iss?: string;
    alg: string;
    kid: string;
    exp?: number | string | Date;
    privateKey: CryptoKey;
  },
) {
  const headers: JWTHeaderParameters = {
    alg: opts.alg,
    kid: opts.kid,
  };
  const signJwt = new SignJWT(claims);

  signJwt.setProtectedHeader(headers);
  signJwt.setExpirationTime(opts.exp ?? DEFAULT_EXPIRY);
  signJwt.setIssuedAt(new Date());

  if (opts.aud) signJwt.setAudience(opts.aud);
  if (opts.iss) signJwt.setIssuer(opts.iss);

  return await signJwt.sign(opts.privateKey);
}
