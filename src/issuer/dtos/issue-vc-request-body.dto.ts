import { IsNotEmpty, IsString } from 'class-validator';

export class IssueVcRequestBodyDto {
  @IsString()
  @IsNotEmpty()
  holderDID: string;

  @IsString()
  @IsNotEmpty()
  pubKey: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  schemaId: string;
}
