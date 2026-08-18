import { IsEnum, IsHexadecimal, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ProofType } from '../enums/proof-type.enum';
import { DID_REGEXP } from '../../iden3/constants';

export class IssueVcRequestBodyDto {
  @IsString()
  @IsNotEmpty()
  @Matches(DID_REGEXP, { message: 'Invalid holderDID Format' })
  holderDID: string;

  @IsString()
  @IsHexadecimal()
  @MaxLength(92)
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
