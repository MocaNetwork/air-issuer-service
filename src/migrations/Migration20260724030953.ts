import { Migration } from '@mikro-orm/migrations';

export class Migration20260724030953 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "sd_jwt_vc" ("id" bigserial primary key, "holder" text not null, "jwt" text not null, "nonce" bigint not null, "revoked" boolean not null default false, "created_at" timestamptz not null default now());`);
    this.addSql(`create index "sd_jwt_vc_holder_index" on "sd_jwt_vc" ("holder");`);
    this.addSql(`alter table "sd_jwt_vc" add constraint "sd_jwt_vc_nonce_unique" unique ("nonce");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "sd_jwt_vc" cascade;`);
  }

}
