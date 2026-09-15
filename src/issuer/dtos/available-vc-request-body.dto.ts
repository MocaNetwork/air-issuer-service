import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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
  @IsIn([ProofType.BJJ_SIG_2021])
  proofType?: ProofType;
}
