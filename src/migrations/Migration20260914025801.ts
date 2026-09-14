import { Migration } from '@mikro-orm/migrations';

export class Migration20260914025801 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`drop table if exists "credential" cascade;`);
    this.addSql(`drop table if exists "revocation" cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`create table "credential" ("created_at" timestamptz(6) not null default now(), "document" jsonb not null, "holder" text not null, "id" bigserial primary key, "nonce" bigint not null);`);
    this.addSql(`create index "credential_holder_index" on "credential" ("holder");`);
    this.addSql(`alter table "credential" add constraint "credential_nonce_unique" unique ("nonce");`);

    this.addSql(`create table "revocation" ("created_at" timestamptz(6) not null default now(), "nonce" bigint not null, primary key ("nonce"));`);
  }

}
