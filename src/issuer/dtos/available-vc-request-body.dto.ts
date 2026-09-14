import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ProofType } from '../enums/proof-type.enum';

export class AvailableVcRequestBodyDto {
  @IsString()
  @IsNotEmpty()
  // TODO: To be defined
  // @Matches(DID_REGEXP, { message: 'Invalid holderDID Format' })
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
  @IsNotEmpty()
  @IsIn([ProofType.SD_JWT_VC])
  proofType?: ProofType;
}
