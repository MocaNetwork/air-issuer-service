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
SEED: 32 byte

PARTNER_ID: UUID of AIR Partner (Issuer)
PARTNER_PRIVATE_KEY_KID: JWKS KID
PARTNER_PRIVATE_KEY_ALG: JWKS Signing Algorithm
PARTNER_PRIVATE_KEY_DER: Private Key in DER Form

API_KEY: Required key for `x-api-key` header
ADMIN_API_KEY: Required key for `x-admin-api-key` header
```

## Credential Schema Setup

Can use `src/issuer/schemas/schema-01KKX3Q7DEK0GM2TCKMMHA.ts` as reference

1. Create a new file src/issuer/schemas/schema-<SCHEMA_ID>.ts
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
