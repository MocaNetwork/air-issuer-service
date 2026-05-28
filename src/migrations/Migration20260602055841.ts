import { Migration } from '@mikro-orm/migrations';

export class Migration20260602055841 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "credential_issuance" ("id" bigserial primary key, "holder_did" text not null, "program_id" text not null, "schema_id" text not null, "revocation_nonce" bigint not null, "created_at" timestamptz not null default now(), "expires_at" timestamptz not null, "revoked_at" timestamptz null);`);
    this.addSql(`create index "credential_issuance_holder_did_index" on "credential_issuance" ("holder_did");`);
    this.addSql(`create index "credential_issuance_program_id_index" on "credential_issuance" ("program_id");`);
    this.addSql(`create index "credential_issuance_schema_id_index" on "credential_issuance" ("schema_id");`);
    this.addSql(`create index "credential_issuance_revocation_nonce_index" on "credential_issuance" ("revocation_nonce");`);

    this.addSql(`create table "issuance_history" ("id" bigserial primary key, "holder" text not null, "schema_id" text not null, "revocation_nonce" bigint not null, "created_at" timestamptz not null default now(), "expires_at" timestamptz not null, "revoked_at" timestamptz null);`);
    this.addSql(`create index "issuance_history_holder_index" on "issuance_history" ("holder");`);
    this.addSql(`create index "issuance_history_schema_id_index" on "issuance_history" ("schema_id");`);
    this.addSql(`create index "issuance_history_revocation_nonce_index" on "issuance_history" ("revocation_nonce");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "credential_issuance" cascade;`);
    this.addSql(`drop table if exists "issuance_history" cascade;`);
  }

}
