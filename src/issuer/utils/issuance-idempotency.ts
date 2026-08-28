import { createHash } from 'node:crypto';

export type PriorIssuance = {
  externalId?: string | null;
  subjectHash?: string | null;
  dstorageInfo?: unknown;
  revokedAt?: Date | null;
};

/** Canonical JSON so key order in credentialSubject does not change the hash. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`).join(',')}}`;
}

/** Hash of claim data only — not expiration, nonce, or credential id. */
export function hashCredentialSubject(credentialSubject: object): string {
  return createHash('sha256').update(canonicalJson(credentialSubject)).digest('hex');
}

export function shouldReuseIssuance(previous: PriorIssuance | null | undefined, subjectHash: string): boolean {
  if (!previous || previous.revokedAt) return false;
  if (!previous.externalId || previous.dstorageInfo == null || !previous.subjectHash) return false;
  return previous.subjectHash === subjectHash;
}
