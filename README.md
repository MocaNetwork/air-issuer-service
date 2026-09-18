# AIR Issuer Service

Self-hosted NestJS service for partners who issue AIR credentials. AIR's credential API proxies holder claim/issue requests to this backend; you own eligibility, subject data, and issuance.

## What you implement

Most of the crypto, encryption, dstorage upload, and revocation plumbing is already wired. As an issuer partner you mainly:

1. **Configure partner identity** — env vars for Postgres, partner JWT signing key, and API keys (see [Environment](#environment)).
2. **Register one schema class per credential type** — map a Credential Dashboard schema to a `BaseSchema` subclass that decides *whether* and *what* to issue for a given `userId` (see [Credential schemas](#credential-schemas)).
3. **Deploy this service** — expose the public HTTP API, then give AIR your `availableVcApiUrl`, `issueVcApiUrl`, and optional `issuerBackendApiKey` (see [Register with AIR](#register-with-air)).

All credentials are issued as SD-JWT VCs (`proofType: SD_JWT_VC`).

Optional features, both off by default and safe to skip:

- [Admin direct issuance](#admin-direct-issuance) - issue on behalf of a user without the interactive claim flow.
- [SD-JWT VC token status list](#optional-sd-jwt-vc-token-status-list) - privacy-preserving batch revocation for SD-JWT VC credentials.

### Do not change (unless you know why)


| Area                                                                      | Why                                                                  |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `POST /available-vc` / `POST /issue-vc` request/response shapes           | Called by AIR API; breaking them breaks the holder claim flow |
| Encryption of `credentialSubject` / issued VCs with the holder's `pubKey` | Only the holder's client can decrypt                                 |
| `GET /revocation-status/:nonce` URL under `ISSUER_ORIGIN`                 | Used by verifiers for revocation checks                              |
| `GET /.well-known/did.json` and `/.well-known/jwt-vc-issuer`              | Publish the issuer `did:web` and the keys that verify issued credentials |
| Partner JWT signing (`PARTNER_PRIVATE_KEY_`*)                             | Used for dstorage and AIR auth                                       |


## Architecture (claim flow)

```
Holder (AIR SDK)
  → AIR API (resolves holder DID / pubKey / userId server-side)
    → this service: POST /available-vc  (preview encrypted subject)
    → this service: POST /issue-vc      (issue, encrypt VC, upload to dstorage)
```

Holder identity (`holderDID`, `pubKey`, `userId`) is always supplied by AIR — never trust client-supplied holder fields for authorization decisions. Use `userId` (your partner's primary identifier for that user) to look up eligibility and attributes in your own systems.

## Project setup

```bash
pnpm install
npx mikro-orm migration:up   # or ./bin/migration-up
```

## Environment

See `.env.example` for sample values.


| Variable                  | Purpose                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | Postgres connection URL                                                                                 |
| `ISSUER_ORIGIN`           | Public origin of **this** service (no trailing slash). Used as SD-JWT JWT `iss` / `jwt-vc-issuer` `issuer`, `did:web` derivation, and status URLs |
| `AIR_API_ORIGIN`          | Optional. AIR API origin used to resolve holders (`initialize-user`); defaults per `NODE_ENV`            |
| `MOCA_CHAIN_API_ORIGIN`   | Optional. Moca chain API origin used for dstorage; defaults per `NODE_ENV`                              |
| `PARTNER_ID`              | AIR partner UUID                                                                                        |
| `PARTNER_PRIVATE_KEY_KID` | JWKS key id                                                                                             |
| `PARTNER_PRIVATE_KEY_ALG` | Signing algorithm (e.g. `RS256`)                                                                        |
| `PARTNER_PRIVATE_KEY_DER` | Partner private key body in DER / PKCS#8 (PEM headers are added in code)                                |
| `PARTNER_JWKS`            | JSON JWKS with the public keys matching `PARTNER_PRIVATE_KEY_*`. Served at `/.well-known/did.json` and `/.well-known/jwt-vc-issuer` |
| `SD_JWT_JWKS`             | Optional. Fallback JWKS used when `PARTNER_JWKS` is unset                                               |
| `API_KEY`                 | Value expected in `x-api-key` for holder-facing routes                                                  |
| `ADMIN_API_KEY`           | Value expected in `x-admin-api-key` for admin routes                                                    |
| `SD_JWT_TSL_PARTITION_SIZE` | Optional. Credentials per status list partition. Setting it enables the [token status list](#optional-sd-jwt-vc-token-status-list); leave unset to disable |

## Credential schemas

This is the main customization surface. Use `src/issuer/sd-jwt-vc-schemas/schema_01KXF7F6Z5XGHXRJY37JEK.ts` as a template.

### Steps

1. In Credential Dashboard, create (or note) the schema: **schema id** and the credential **type** (`vct`).
2. Add `src/issuer/sd-jwt-vc-schemas/schema_<SCHEMA_ID>.ts` extending `BaseSchema`.
3. Register the instance in `src/issuer/sd-jwt-vc-schemas/index.ts` (`schemas` array).

### Required fields / method

```ts
import { DisclosureFrame } from '@sd-jwt/core';
import { BaseSchema } from './base-schema';

type Claim = {
  someField: string;
};

class Schema_<SCHEMA_ID> extends BaseSchema<Claim> {
  public readonly schemaId = '<SCHEMA_ID>';              // Credential Dashboard schema id
  public readonly vct = undefined;                       // credential type; defaults to schemaId
  public readonly ['vct#integrity'] = undefined;         // optional type metadata digest
  public readonly disclosureFrame: DisclosureFrame<Claim> = {
    _sd: ['someField'],                                  // claims the holder can disclose selectively
  };
  public readonly expirySec = 30 * 24 * 60 * 60;         // credential lifetime in seconds

  /**
   * Return the claims for this user.
   * Called for both available-vc (preview) and issue-vc (actual issuance).
   * Throw or return empty / omit from claimable set if the user is not eligible
   * (customize claimableVCs / generateCredentialData as needed).
   */
  async generateCredentialData(userId: string) {
    // Load attributes from your DB / APIs using userId
    return {
      credentialSubject: {
        someField: '...',
      },
      expiration: Math.floor(Date.now() / 1000) + this.expirySec, // unix seconds
    };
  }
}

export default new Schema_<SCHEMA_ID>();
```

Register:

```ts
// src/issuer/sd-jwt-vc-schemas/index.ts
import Schema1 from './schema_01KXF7F6Z5XGHXRJY37JEK';
import Schema2 from './schema_<YOUR_SCHEMA_ID>';

const schemas: BaseSchema<any>[] = [Schema1, Schema2];
export default schemas;
```

### Implementation tips

- **`userId`** is the partner primary identifier AIR resolved for the holder (e.g. email / external id). Use it to fetch real claim data; do not invent attributes from `holderDID` alone unless that is your model.
- **`credentialSubject` keys** must match the schema in Credential Dashboard. Type mismatches (string vs number vs boolean) will break verification.
- **Reserved claims**: `issue` sets `id`, `nonce`, `vct`, `sub`, `exp`, and `cnf` on the SD-JWT payload. Do not return them from `generateCredentialData`.
- **`expirySec`** determines the `exp` of the issued credential; the `expiration` returned by `generateCredentialData` is only the preview value.
- **Eligibility**: default `claimableVCs` just calls `generateCredentialData`. Override `claimableVCs` on `BaseSchema` if you need different preview vs issue behavior, or to skip ineligible users.
- **Idempotency / business rules** (one credential per user, re-issue after expiry, etc.) belong in your schema / service layer — add checks before calling `issue`.
- Keep subject payloads free of secrets you would not want encrypted to the holder's key and stored in dstorage.

## HTTP API

### Holder-facing (called by AIR API)

Auth: `x-api-key: <API_KEY>` (optional on the AIR side if no `issuerBackendApiKey` is configured; if you set `API_KEY` here, configure the same value with AIR).

#### `POST /available-vc`

Preview claimable credentials. Response `credentialSubject` is an encryption package for the holder's `pubKey`.

Request:

```json
{
  "holderDID": "did:air:...",
  "pubKey": "0x...",
  "userId": "<partner primary id>",
  "schemaId": "<optional filter>",
  "proofType": "SD_JWT_VC"
}
```

Response:

```json
{
  "data": [
    {
      "holderDID": "did:air:...",
      "schemaId": "...",
      "credentialSubject": {
        "encryptedData": "...",
        "iv": "...",
        "authTag": "...",
        "dataEncPublicKey": "..."
      },
      "proofType": "SD_JWT_VC"
    }
  ]
}
```

#### `POST /issue-vc`

Issue the credential for one schema, persist issuance history, encrypt the VC, upload to dstorage.

Request:

```json
{
  "holderDID": "did:air:...",
  "pubKey": "0x...",
  "userId": "<partner primary id>",
  "schemaId": "<required>",
  "signingKey": { "jwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." } },
  "proofType": "SD_JWT_VC"
}
```

`encryptionKey` is accepted as an alias of `pubKey`. `signingKey.jwk`, when present, becomes the credential's `cnf` (holder key binding).

### Public

No API key (URLs are embedded in credentials or resolved by verifiers).


| Method | Path                        | Purpose                                  |
| ------ | --------------------------- | ---------------------------------------- |
| `GET`  | `/revocation-status/:nonce` | `{ "isRevoked": boolean }`               |
| `GET`  | `/statuslist/:partition`    | Signed status list partition. Only when the [token status list](#optional-sd-jwt-vc-token-status-list) is enabled |
| `GET`  | `/.well-known/did.json`     | Issuer `did:web` document (verification methods + AIR partner info service) |
| `GET`  | `/.well-known/jwt-vc-issuer` | SD-JWT VC issuer metadata: `issuer` and the JWKS verifiers use to check issued credentials and status lists |
| `GET`  | `/.well-known/air-partner-info` | `{ "partnerId": "<PARTNER_ID>" }`, referenced from the DID document |


`ISSUER_ORIGIN` must be the publicly reachable origin that serves these routes. SD-JWT credentials use it as JWT `iss`, which must equal `/.well-known/jwt-vc-issuer` `issuer`. The Iden3/W3C DID document is still `did:web:<host>`.

### Admin

Auth: `x-admin-api-key: <ADMIN_API_KEY>`.


| Method | Path                      | Purpose                                                                                  |
| ------ | ------------------------- | ---------------------------------------------------------------------------------------- |
| `GET`  | `/admin/issuance-history` | Paginated history (`page`, `limit`, `order`, `holderDid`, `schemaId`, `revocationNonce`) |
| `POST` | `/admin/revoke`           | Body `{ "nonce": "<revocationNonce>" }`                                                  |
| `POST` | `/admin/issue-vc`         | Issue on behalf of a user, without a registered schema class (see [Admin direct issuance](#admin-direct-issuance)) |
| `POST` | `/admin/publish-token-status-list` | Rebuild and publish status list partitions. Only when the [token status list](#optional-sd-jwt-vc-token-status-list) is enabled |


## Register with AIR

After deploy:

1. Confirm `GET ${ISSUER_ORIGIN}/.well-known/did.json` and `GET ${ISSUER_ORIGIN}/revocation-status/...` are reachable over HTTPS.
2. Provide the AIR team (or partner config UI) with:
  - `availableVcApiUrl` — full URL to `POST /available-vc` (e.g. `https://issuer.example.com/available-vc`)
  - `issueVcApiUrl` — full URL to `POST /issue-vc`
  - `issuerBackendApiKey` — same value as `API_KEY` (optional but recommended)
3. Register issuer identity + schemas in Credential Dashboard / AIR partner setup (`PARTNER_ID`, JWKS / `PARTNER_PRIVATE_KEY_*`). SD-JWT programs allowlist `ISSUER_ORIGIN` (the HTTPS issuer id). Iden3 still uses `did:web:<host of ISSUER_ORIGIN>`. Changing `ISSUER_ORIGIN` changes the SD-JWT issuer identity.

AIR API resolves the holder, then POSTs to your URLs. Misconfigured or unreachable URLs surface as issuer-backend unavailable to the holder.

### CORS

If you enable CORS on this backend (or on a reverse proxy in front of it), whitelist `*.air3.com` so AIR frontends can call your issuer endpoints from the browser. Restricting origins to only your own domain will break the holder claim flow.

## Compile and run

```bash
# development
pnpm run start
# or: pnpm run start:dev

# production
pnpm run build
pnpm run start:prod
```

Default port: `PORT` or `3000`.

## Admin direct issuance

Issue without the interactive claim UI and without a registered schema class. The holder is resolved from `userId` via AIR `initialize-user` (so `userId` must be the email AIR knows the user by), then the credential is issued, encrypted to the holder's key, and uploaded to dstorage exactly as in the claim flow.

```bash
curl -X POST "$ISSUER_ORIGIN/admin/issue-vc" \
  -H "x-admin-api-key: $ADMIN_API_KEY" \
  -H 'content-type: application/json' \
  -d '{
    "userId": "test@animocabrands.com",
    "schemaId": "01KXF7F6Z5XGHXRJY37JEK",
    "vct": "01KXF7F6Z5XGHXRJY37JEK",
    "expiration": "2030-01-01T00:00:00+08:00",
    "credentialSubject": { "firstName": "Ada", "lastName": "Lovelace" },
    "disclosureFrame": { "_sd": ["firstName", "lastName"] }
  }'
```

- `expiration` — ISO 8601, must be in the future.
- `credentialSubject` — must not contain the reserved claims `cnf`, `exp`, `iat`, `id`, `iss`, `nonce`, `status`, `sub`, `vct`, `vct#integrity`.
- `disclosureFrame` — optional; defaults to making every first-level `credentialSubject` key selectively disclosable.

Issuance is recorded in `/admin/issuance-history` and revoked the same way as claimed credentials.

## Optional: SD-JWT VC token status list

Only relevant if you issue credentials with `proofType: SD_JWT_VC`, and disabled unless you set `SD_JWT_TSL_PARTITION_SIZE`. It publishes revocation as a single compressed bit array per partition, so verifiers check status without revealing which credential they are looking at, instead of calling `GET /revocation-status/:nonce` per credential. Revocation works either way - the status list is a privacy and caching improvement, not a requirement.

The partition size is permanent once you start issuing, so read [docs/sd-jwt-tsl.md](docs/sd-jwt-tsl.md) before enabling it. It covers how to size partitions, when to publish, and the current limitations.

## Checklist before go-live

- [ ] `did:web` document served at `${ISSUER_ORIGIN}/.well-known/did.json` and registered with AIR
- [ ] Partner JWT keys (`PARTNER_*`) match AIR JWKS, and `PARTNER_JWKS` / `SD_JWT_JWKS` hold the matching public keys
- [ ] Each Credential Dashboard schema has a matching class in `src/issuer/sd-jwt-vc-schemas/` and is exported from `index.ts`
- [ ] `generateCredentialData` returns schema-valid subjects, and `disclosureFrame` / `expirySec` are set per schema
- [ ] Migrations applied; Postgres durable
- [ ] `ISSUER_ORIGIN` is public HTTPS; status endpoints reachable
- [ ] If CORS is enabled, `*.air3.com` is whitelisted
- [ ] `availableVcApiUrl` / `issueVcApiUrl` / `issuerBackendApiKey` set in AIR partner config
- [ ] If using the [token status list](#optional-sd-jwt-vc-token-status-list): `SD_JWT_TSL_PARTITION_SIZE` finalized before first issuance, and a publish job scheduled
- [ ] Smoke-test claim flow end-to-end with a test holder
