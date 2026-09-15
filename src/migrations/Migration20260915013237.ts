import { Migration } from '@mikro-orm/migrations';

export class Migration20260915013237 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`drop table if exists "sd_jwt_vc" cascade;`);
    this.addSql(`drop table if exists "tsl_partition" cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`create table "sd_jwt_vc" ("created_at" timestamptz(6) not null default now(), "holder" text not null, "id" bigserial primary key, "jwt" text not null, "nonce" bigint not null, "revoked" boolean not null default false, "updated_at" timestamptz(6) not null default now());`);
    this.addSql(`create index "sd_jwt_vc_holder_index" on "sd_jwt_vc" ("holder");`);
    this.addSql(`alter table "sd_jwt_vc" add constraint "sd_jwt_vc_nonce_unique" unique ("nonce");`);

    this.addSql(`create table "tsl_partition" ("bits" int not null default 1, "id" bigint not null, "list" bytea not null, "updated_at" timestamptz(6) not null default now(), primary key ("id"));`);
    this.addSql(`comment on column "tsl_partition"."list" is 'zlib deflated';`);
  }

}
