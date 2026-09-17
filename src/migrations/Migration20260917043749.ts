import { Migration } from '@mikro-orm/migrations';

export class Migration20260917043749 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "credential_issuance" add "type" text null;`);
    this.addSql(`create index "credential_issuance_type_index" on "credential_issuance" ("type");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "credential_issuance_type_index";`);
    this.addSql(`alter table "credential_issuance" drop column "type";`);
  }

}
