import { canonicalJson, hashCredentialSubject, shouldReuseIssuance } from './issuance-idempotency';

describe('canonicalJson', () => {
  it('is stable across key order', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });
});

describe('hashCredentialSubject', () => {
  it('matches for the same claims', () => {
    expect(hashCredentialSubject({ firstName: 'Ada', lastName: 'Lovelace' })).toBe(
      hashCredentialSubject({ lastName: 'Lovelace', firstName: 'Ada' }),
    );
  });

  it('changes when a claim changes', () => {
    expect(hashCredentialSubject({ firstName: 'Ada' })).not.toBe(hashCredentialSubject({ firstName: 'Charles' }));
  });
});

describe('shouldReuseIssuance', () => {
  const live = {
    externalId: 'urn:11111111-1111-1111-1111-111111111111',
    subjectHash: 'abc',
    dstorageInfo: { storagePath: 'did:air:x/y' },
    revokedAt: null,
  };

  it('reuses when the live issuance has the same subject hash', () => {
    expect(shouldReuseIssuance(live, 'abc')).toBe(true);
  });

  it('does not reuse when claims changed', () => {
    expect(shouldReuseIssuance(live, 'def')).toBe(false);
  });

  it('does not reuse a revoked issuance', () => {
    expect(shouldReuseIssuance({ ...live, revokedAt: new Date() }, 'abc')).toBe(false);
  });

  it('does not reuse when there is no prior row or no stored hash', () => {
    expect(shouldReuseIssuance(null, 'abc')).toBe(false);
    expect(shouldReuseIssuance({ ...live, subjectHash: null }, 'abc')).toBe(false);
    expect(shouldReuseIssuance({ ...live, externalId: null }, 'abc')).toBe(false);
    expect(shouldReuseIssuance({ ...live, dstorageInfo: null }, 'abc')).toBe(false);
  });
});
