import { Migration } from '@mikro-orm/migrations';

export class Migration20260529075448 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "revocation" ("nonce" bigint not null, "created_at" timestamptz not null default now(), primary key ("nonce"));`);

    this.addSql(`alter table "credential" drop column "updated_at";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "revocation" cascade;`);

    this.addSql(`alter table "credential" add "updated_at" timestamptz(6) not null default now();`);
  }

}
