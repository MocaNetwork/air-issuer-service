# SD-JWT VC Token Status List

**Token Status List (TSL) is optional.** It only applies to credentials issued with `proofType: SD_JWT_VC`, and it is off unless you set `SD_JWT_TSL_PARTITION_SIZE`. With it off, SD-JWT VCs are still revocable - verifiers just have to ask this service about one credential at a time via `GET /revocation-status/:nonce?proofType=SD_JWT_VC`.

## Background

TSL ([`draft-ietf-oauth-status-list`](https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/)) replaces per-credential status lookups with a single published bit array. Each issued credential carries a pointer to its own bit:

```json
{
  "status": {
    "status_list": {
      "idx": 12345,
      "uri": "https://issuer.example.com/statuslist/0"
    }
  }
}
```

A verifier fetches `uri`, decompresses the list, and reads the bit at `idx`: `0` = valid, `1` = invalid (revoked). Because the verifier downloads the status of many credentials at once, the issuer never learns which credential was being checked, and the list is cacheable - a verifier can validate offline until its cached copy goes stale.

### How it works here

- **1 bit per status.** `BIT_LENGTH` is fixed at `1`, so a credential is either valid or revoked. The spec's `suspended` status would need 2 bits and is not supported.
- **Partitions.** A credential's global index is its `sd_jwt_vc.id - 1`. That index is split into a partition number (`index / SD_JWT_TSL_PARTITION_SIZE`) and a bit offset inside it (`index % SD_JWT_TSL_PARTITION_SIZE`). Because ids are sequential, credentials issued around the same time land in the same partition.
- **Storage.** Each partition is one row in `tsl_partition`, holding the zlib-deflated bit array.
- **Serving.** `GET /statuslist/:partition` returns the partition as a signed JWT (`typ: statuslist+jwt`, content type `application/statuslist+jwt`), signed with the partner key (`PARTNER_PRIVATE_KEY_*`). The JWT's `iat` is the partition's last publish time. Verifiers resolve the verification key from `GET /.well-known/jwt-vc-issuer`, so `SD_JWT_JWKS` must contain the public key matching `PARTNER_PRIVATE_KEY_KID`.

## Setup

1. Apply migrations so the `tsl_partition` table exists (`npx mikro-orm migration:up`).
2. Set `SD_JWT_TSL_PARTITION_SIZE` to the number of credentials each partition covers. Use a multiple of 8 so a partition packs into whole bytes with no wasted tail.
3. Make sure `ISSUER_ORIGIN` is the public origin - it is baked into the `uri` of every credential issued from here on.

### Choosing a partition size

The partition size trades download size against the number of partitions, and both ends have real costs:

- **Larger partitions** give better privacy (the anonymity set is everyone in the partition), fewer partitions to publish and cache, and compress well since most bits are zero. The cost is that every verifier downloads the whole partition to check one credential.
- **Smaller partitions** keep each download tiny, but narrow the anonymity set, multiply the number of URLs to publish and cache, and make `publish` slower as partition count grows.

In practice, size it from your issuance volume and credential lifetime: aim for a handful of partitions over the lifetime of the credentials rather than hundreds. As a reference point, 80,000 bits is 10 KB uncompressed and typically a few hundred bytes deflated when few credentials are revoked. If credentials are short-lived, older partitions go fully expired and stop being fetched, so a size that covers roughly one credential lifetime of issuance works well.

**The partition size cannot be changed once you start issuing.** `idx` and `uri` are embedded in credentials already in holders' wallets; changing the size repoints them at the wrong bits. Treat it as permanent, and pick with room to grow.

### Enabling on an existing deployment

Credentials issued before you set `SD_JWT_TSL_PARTITION_SIZE` have no `status` claim and keep relying on `GET /revocation-status/:nonce`. Only new credentials get status list entries. Nothing needs to be re-issued unless you want existing credentials covered by the list.

## Workflow

### 1. Revoke

```bash
curl -X POST "$ISSUER_ORIGIN/admin/revoke" \
  -H "x-admin-api-key: $ADMIN_API_KEY" \
  -H 'content-type: application/json' \
  -d '{"nonce":"<revocationNonce>","proofType":"SD_JWT_VC"}'
```

This marks the credential revoked in the database immediately, so `GET /revocation-status/:nonce?proofType=SD_JWT_VC` reflects it right away. The **published status list does not change yet.**

### 2. Publish

```bash
curl -X POST "$ISSUER_ORIGIN/admin/publish-token-status-list" \
  -H "x-admin-api-key: $ADMIN_API_KEY"
```

This rebuilds every partition from the current database state and stores the result. It is a full rebuild, not an incremental update, so its cost scales with the number of partitions - not with the number of credentials you just revoked.

You do **not** need to publish after each revocation, and for anything but very low volume you should not. Batch instead, and pick a cadence from how fast revocation must propagate for your use case:

- **Revocation is urgent** (fraud, account compromise, access credentials): publish on a short schedule, e.g. every few minutes, or trigger a publish right after a revocation batch.
- **Revocation is routine** (membership lapses, tier changes): a nightly or hourly job is usually enough.
- **Credentials are short-lived**: expiry may already do most of the work, and publishing daily is fine.

Whatever you choose, tell verifiers: propagation delay is publish cadence plus however long they cache the list.

### 3. Verifiers fetch the list

```bash
curl "$ISSUER_ORIGIN/statuslist/0"
```

No API key - the URL is public and embedded in credentials. Returns `501 Not Implemented` when TSL is disabled, and `404` for a partition that has never been published.

Responses are signed per request, so this endpoint is a good candidate for a CDN or reverse-proxy cache. Keep the cache TTL no longer than your publish interval, or revocations will sit invisible behind the cache.

## Limitations

- Only valid and revoked are representable (1 bit per status); suspension is not supported.
- `publish` rebuilds all partitions and is not safe to run concurrently with itself - run it from a single scheduler.
- The status list JWT carries no `exp` or `ttl` claim, so verifiers have no issuer-supplied cache hint and will apply their own policy.
- Revoking is one-way; there is no un-revoke path.
