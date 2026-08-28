# AIR Issuer Service

Self-hosted NestJS service for partners who issue AIR credentials. AIR's credential API proxies holder claim/issue requests to this backend; you own eligibility, subject data, and issuance.

## What you implement

Most of the crypto, encryption, dstorage upload, and revocation plumbing is already wired. As an issuer partner you mainly:

1. **Configure partner identity** — env vars for Postgres, `SEED`, partner JWT signing key, and API keys (see [Environment](#environment)).
2. **Register one schema class per credential type** — map a Credential Dashboard schema to a `BaseSchema` subclass that decides *whether* and *what* to issue for a given `userId` (see [Credential schemas](#credential-schemas)).
3. **Deploy this service** — expose the public HTTP API, then give AIR your `availableVcApiUrl`, `issueVcApiUrl`, and optional `issuerBackendApiKey` (see [Register with AIR](#register-with-air)).
4. **Register your issuer DID** — after first boot, extract the DID derived from `SEED` and register it with the AIR team / Credential Dashboard (see [Extract issuer DID](#extract-issuer-did)).

Optional: use [direct issuance (CSV)](#direct-issuance-issue-on-behalf) for bulk issue-on-behalf without the interactive claim flow.

### Do not change (unless you know why)


| Area                                                                      | Why                                                                  |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `POST /available-vc` / `POST /issue-vc` request/response shapes           | Called by AIR API; breaking them breaks the holder claim flow |
| Encryption of `credentialSubject` / issued VCs with the holder's `pubKey` | Only the holder's client can decrypt                                 |
| `GET /credential-status/:nonce` URL under `ISSUER_ORIGIN`                 | Embedded in issued credentials for revocation checks                 |
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
| `ISSUER_ORIGIN`           | Public origin of **this** service (no trailing slash). Used in credential status URLs                   |
| `AIR_API_ORIGIN`          | AIR API origin (batch issue / initialize-user). Reach out to AIR team                                   |
| `MOCA_CHAIN_API_ORIGIN`   | Moca chain API origin. Reach out to AIR team                                                            |
| `SEED`                    | 32-byte hex seed for the issuer BabyJubJub identity (**private**). Changing it creates a new issuer DID |
| `PARTNER_ID`              | AIR partner UUID                                                                                        |
| `PARTNER_PRIVATE_KEY_KID` | JWKS key id                                                                                             |
| `PARTNER_PRIVATE_KEY_ALG` | Signing algorithm (e.g. `RS256`)                                                                        |
| `PARTNER_PRIVATE_KEY_DER` | Partner private key body in DER / PKCS#8 (PEM headers are added in code)                                |
| `API_KEY`                 | Value expected in `x-api-key` for holder-facing routes                                                  |
| `ADMIN_API_KEY`           | Value expected in `x-admin-api-key` for admin routes                                                    |


Generate `SEED` with a CSPRNG:

```bash
echo 0x`openssl rand -hex 32`
```

Treat `SEED`, partner private key material, and API keys as secrets. Back up `SEED` — losing it means you can no longer operate as that issuer DID.

## Extract issuer DID

After the app can boot with a valid `SEED`:

```bash
echo 'console.log(get(CredentialIssuingService).issuerDID.string());' | pnpm run repl -
```

Register this DID with AIR / Credential Dashboard before going live. The DID is deterministic from `SEED`; do not rotate `SEED` for an existing issuer.

## Credential schemas

This is the main customization surface. Use `src/issuer/schemas/schema-01KKX3Q7DEK0GM2TCKMMHA.ts` as a template.

### Steps

1. In Credential Dashboard, create (or note) the schema: **schema id**, **type**, **schema JSON URL**, **JSON-LD context URL**.
2. Add `src/issuer/schemas/schema-<SCHEMA_ID>.ts` implementing `BaseSchema`.
3. Register the class in `src/issuer/schemas/index.ts` (`schemas` array).

### Required fields / method

```ts
import { BaseSchema } from './base-schema';

export default class Schema extends BaseSchema {
  public readonly schemaId = '<SCHEMA_ID>';           // Credential Dashboard schema id
  public readonly schemaType = '<TYPE>';               // credential type string
  public readonly schemaUrl = 'https://.../schema';    // JSON schema download URL
  public readonly schemaContextUrl = 'https://.../ctx'; // JSON-LD context URL

  /**
   * Return the claims + expiry for this user.
   * Called for both available-vc (preview) and issue-vc (actual issuance).
   * Throw or return empty / omit from claimable set if the user is not eligible
   * (customize claimableVCs / generateCredentialData as needed).
   */
  async generateCredentialData(userId: string) {
    // Load attributes from your DB / APIs using userId
    return {
      credentialSubject: {
        // keys must match the schema definition (do not include `id`;
        // the framework sets credentialSubject.id = holderDID)
        someField: '...',
      },
      expiration: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // unix seconds
    };
  }
}
```

Register:

```ts
// src/issuer/schemas/index.ts
import Schema1 from './schema-01KKX3Q7DEK0GM2TCKMMHA';
import Schema2 from './schema-<YOUR_SCHEMA_ID>';

const schemas: BaseSchema[] = [new Schema1(), new Schema2()];
export default schemas;
```

### Implementation tips

- **`userId`** is the partner primary identifier AIR resolved for the holder (e.g. email / external id). Use it to fetch real claim data; do not invent attributes from `holderDID` alone unless that is your model.
- **`credentialSubject` keys** must match the schema in Credential Dashboard. Type mismatches (string vs number vs boolean) will break merklization / verification.
- **`expiration`** is unix time in **seconds**.
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
  "schemaId": "<optional filter>"
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
      }
    }
  ]
}
```

#### `POST /issue-vc`

Issue the credential for one schema, persist issuance history, encrypt the VC, upload to dstorage. Repeat calls for the same holder and schema reuse the existing credential/`externalId` unless the subject claims changed.

Request:

```json
{
  "holderDID": "did:air:...",
  "pubKey": "0x...",
  "userId": "<partner primary id>",
  "schemaId": "<required>"
}
```

### Public status

No API key (URLs are embedded in credentials).


| Method | Path                        | Purpose                                  |
| ------ | --------------------------- | ---------------------------------------- |
| `GET`  | `/credential-status/:nonce` | Non-revocation / credential status proof |
| `GET`  | `/revocation-status/:nonce` | `{ "isRevoked": boolean }`               |


`ISSUER_ORIGIN` must be the publicly reachable origin that serves these routes.

### Admin

Auth: `x-admin-api-key: <ADMIN_API_KEY>`.


| Method | Path                      | Purpose                                                                                  |
| ------ | ------------------------- | ---------------------------------------------------------------------------------------- |
| `GET`  | `/admin/issuance-history` | Paginated history (`page`, `limit`, `order`, `holderDid`, `schemaId`, `revocationNonce`) |
| `POST` | `/admin/revoke`           | Body `{ "nonce": "<revocationNonce>" }`                                                  |


## Register with AIR

After deploy:

1. Confirm `GET ${ISSUER_ORIGIN}/credential-status/...` is reachable over HTTPS.
2. Provide the AIR team (or partner config UI) with:
  - `availableVcApiUrl` — full URL to `POST /available-vc` (e.g. `https://issuer.example.com/available-vc`)
  - `issueVcApiUrl` — full URL to `POST /issue-vc`
  - `issuerBackendApiKey` — same value as `API_KEY` (optional but recommended)
3. Register issuer DID + schemas in Credential Dashboard / AIR partner setup (`PARTNER_ID`, JWKS / `PARTNER_PRIVATE_KEY_*`).

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

## Direct issuance (issue on behalf)

Batch-issue without the interactive claim UI. Resolves each email via AIR `initialize-user`, issues, encrypts, and uploads.

CSV columns:

```
Required:
- email
- expiration
- credentialSubject.[field1]
- credentialSubject.[field2]
...
```

All `credentialSubject.[field]` cells must be **JSON-stringified** values:

```js
JSON.stringify("Hello World"); // => "Hello World"  (quotes in the CSV cell)
JSON.stringify(100);           // => 100
JSON.stringify(true);          // => true
```

Example:

```csv
email,expiration,credentialSubject.field1,credentialSubject.field2
test@animocabrands.com,2030-01-01T00:00:00+08:00,"""Hello World""",4
```

```bash
pnpm run batch-issue-vc-csv -- \
  SCHEMA_ID \
  SCHEMA_URL \
  SCHEMA_TYPE \
  path_to_csv_file.csv

# Example:
pnpm run batch-issue-vc-csv -- \
  01KKX3Q7DEK0GM2TCKMMHA \
  https://credential.api.staging.air3.com/dstorage/download/01KKX3Q7DFFWNMD85T17X8 \
  mocabasher \
  ./credentials-batch-1.csv
```

Result log: `[unix_timestamp_ms].csv`.

## Checklist before go-live

- [ ] `SEED` generated securely and backed up
- [ ] Issuer DID extracted and registered with AIR
- [ ] Partner JWT keys (`PARTNER_*`) match AIR JWKS
- [ ] Each Credential Dashboard schema has a matching class in `src/issuer/schemas/` and is exported from `index.ts`
- [ ] `generateCredentialData` returns schema-valid subjects and sensible expirations
- [ ] Migrations applied; Postgres durable
- [ ] `ISSUER_ORIGIN` is public HTTPS; status endpoints reachable
- [ ] If CORS is enabled, `*.air3.com` is whitelisted
- [ ] `availableVcApiUrl` / `issueVcApiUrl` / `issuerBackendApiKey` set in AIR partner config
- [ ] Smoke-test claim flow end-to-end with a test holder
