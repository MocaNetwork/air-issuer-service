import { IsIn, IsNotEmpty, IsNumberString, IsOptional, MaxLength } from 'class-validator';
import { ProofType } from '../enums/proof-type.enum';

export class NonceRequestBodyDto {
  @IsNumberString()
  @IsNotEmpty()
  @MaxLength(20)
  nonce: string;

  @IsOptional()
  @IsNotEmpty()
  @IsIn([ProofType.SD_JWT_VC])
  proofType?: ProofType;
}
