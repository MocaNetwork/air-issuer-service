import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AvailableVcRequestBodyDto {
  @IsString()
  @IsNotEmpty()
  holderDID: string;

  @IsString()
  @IsNotEmpty()
  pubKey: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  programId?: string;
}
