import { Migration } from '@mikro-orm/migrations';

export class Migration20260603015826 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`drop index "credential_issuance_program_id_index";`);
    this.addSql(`alter table "credential_issuance" drop column "program_id";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "credential_issuance" add "program_id" text not null;`);
    this.addSql(`create index "credential_issuance_program_id_index" on "credential_issuance" ("program_id");`);
  }

}
