import { IsEnum, IsHexadecimal, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ProofType } from '../enums/proof-type.enum';

export class IssueVcRequestBodyDto {
  @IsString()
  @IsNotEmpty()
  holderDID: string;

  @IsString()
  @IsHexadecimal()
  @IsNotEmpty()
  pubKey: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  schemaId: string;

  @IsOptional()
  @IsEnum(ProofType)
  @IsNotEmpty()
  proofType?: ProofType;
}
