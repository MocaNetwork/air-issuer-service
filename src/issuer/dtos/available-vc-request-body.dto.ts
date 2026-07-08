import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ProofType } from '../enums/proof-type.enum';

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
  schemaId?: string;

  @IsOptional()
  @IsEnum(ProofType)
  @IsNotEmpty()
  proofType?: ProofType;
}
