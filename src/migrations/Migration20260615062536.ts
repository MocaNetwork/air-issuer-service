import { Migration } from '@mikro-orm/migrations';

export class Migration20260615062536 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`drop table if exists "issuance_history" cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`create table "issuance_history" ("created_at" timestamptz(6) not null default now(), "expires_at" timestamptz(6) not null, "holder" text not null, "id" varchar(255) primary key, "revocation_nonce" bigint not null, "revoked_at" timestamptz(6) null, "schema_id" text not null);`);
    this.addSql(`create index "issuance_history_holder_index" on "issuance_history" ("holder");`);
    this.addSql(`create index "issuance_history_revocation_nonce_index" on "issuance_history" ("revocation_nonce");`);
    this.addSql(`create index "issuance_history_schema_id_index" on "issuance_history" ("schema_id");`);
  }

}
