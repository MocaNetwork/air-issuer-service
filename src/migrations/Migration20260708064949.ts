import { Migration } from '@mikro-orm/migrations';

export class Migration20260708064949 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "credential_issuance" add "dstorage_info" jsonb null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "credential_issuance" drop column "dstorage_info";`);
  }

}
