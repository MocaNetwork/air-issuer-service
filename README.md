## Description

The AIR Issuer Service provides a self-hosted environment for partners to issue credentials.

## Project setup

```bash
$ pnpm install
$ npx mikro-orm migration:up # or use ./bin/migration-up
```

## Environment Variable Setup:

Can refer to `.env.example` file for example values.

```
DATABASE_URL: Postgres URL connection
ISSUER_ORIGIN: URL Origin of this issuer backend
MOCA_CHAIN_API_ORIGIN: URL of moca-chain-api origin. <Reach out to AIR Team>
SEED: generate a random 32 byte hex (private info)

PARTNER_ID: UUID of AIR Partner (Issuer)
PARTNER_PRIVATE_KEY_KID: JWKS KID
PARTNER_PRIVATE_KEY_ALG: JWKS Signing Algorithm
PARTNER_PRIVATE_KEY_DER: Private Key in DER Form

API_KEY: Required key for `x-api-key` header
ADMIN_API_KEY: Required key for `x-admin-api-key` header
```

Note: Ensure that a cryptographically secure randomizer is used to generate `SEED`. Such as:

```
echo 0x`openssl rand -hex 32`
```

## Extracting Issuer DID

```
echo 'console.log(get(CredentialIssuingService).issuerDID.string());' | pnpm run repl -
```

## Credential Schema Setup

Can use `src/issuer/schemas/schema-01KKX3Q7DEK0GM2TCKMMHA.ts` as reference

1. Create a new file `src/issuer/schemas/schema-<SCHEMA_ID>.ts`
2. Implement the following in your schema class: (Refer to your schema setup in Credential Dashboard)
    1. `public readonly schemaId: string`
    2. `public readonly schemaType: string`
    3. `public readonly schemaUrl: string`
    4. `public readonly schemaContextUrl: string`
    5. `generateCredentialData(userId: string)`
3. Include the new schema class in `src/issuer/schemas/index.ts` `schemas` export

## Compile and run the project

```bash
# development
$ pnpm run start

# production mode
$ pnpm run start:prod
```

## Direct Issuance (Issue on Behalf)

CSV File Format:

```
Required Columns:
- email
- expiration
- credentialSubject.[field1]
- credentialSubject.[field2]
...
- credentialSubject.[fieldn]
```

All `credentialSubject.[field]` values must be represented in JSON stringified value.

```javascript
JSON.stringify("Hello World");
// => "Hello World"

JSON.stringify(100);
// => 100

JSON.stringify(true);
// => true
```

Example:

```csv
email,expiration,credentialSubject.field1,credentialSubject.field2
test@animocabrands.com,2030-01-01T00:00:00+08:00,"""Hello World""",4
```

```bash
$ pnpm run batch-issue-vc-csv -- \
  SCHEMA_ID \
  SCHEMA_URL \
  SCHEMA_TYPE \
  path_to_csv_file.csv
  
# Example:
$ pnpm run batch-issue-vc-csv -- \
  01KKX3Q7DEK0GM2TCKMMHA \
  https://credential.api.staging.air3.com/dstorage/download/01KKX3Q7DFFWNMD85T17X8 \
  mocabasher \
  ./credentials-batch-1.csv
```

Result log are saved as `[unix_timestamp_ms].csv`.
