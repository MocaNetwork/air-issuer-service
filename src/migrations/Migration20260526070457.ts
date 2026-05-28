import { Migration } from '@mikro-orm/migrations';

export class Migration20260526070457 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "credential" ("id" bigserial primary key, "holder" text not null, "document" jsonb not null, "nonce" bigint not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now());`);
    this.addSql(`create index "credential_holder_index" on "credential" ("holder");`);
    this.addSql(`alter table "credential" add constraint "credential_nonce_unique" unique ("nonce");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "credential" cascade;`);
  }

}
