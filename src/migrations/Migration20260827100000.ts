import { Migration } from '@mikro-orm/migrations';

export class Migration20260827100000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(`alter table "credential_issuance" add "external_id" text null;`);
    this.addSql(`alter table "credential_issuance" add "subject_hash" text null;`);
    this.addSql(`create index "credential_issuance_external_id_index" on "credential_issuance" ("external_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "credential_issuance_external_id_index";`);
    this.addSql(`alter table "credential_issuance" drop column "external_id";`);
    this.addSql(`alter table "credential_issuance" drop column "subject_hash";`);
  }
}
