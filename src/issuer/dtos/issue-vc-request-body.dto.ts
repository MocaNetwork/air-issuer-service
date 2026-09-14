import {
  IsDefined,
  IsEnum,
  IsHexadecimal,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { ProofType } from '../enums/proof-type.enum';
import { JsonWebKeyDto } from './json-web-key.dto';

class SigningKeyDto {
  @ValidateNested()
  @IsDefined()
  jwk: JsonWebKeyDto;
}

export class IssueVcRequestBodyDto {
  @IsString()
  @IsNotEmpty()
  // TODO: To be defined
  // @Matches(DID_REGEXP, { message: 'Invalid holderDID Format' })
  holderDID: string;

  @IsString()
  @IsHexadecimal()
  @MaxLength(92)
  @ValidateIf((o) => o.encryptionKey === undefined)
  pubKey: string;

  @IsString()
  @IsHexadecimal()
  @ValidateIf((o) => o.pubKey === undefined)
  encryptionKey?: string;

  @ValidateNested()
  @IsDefined()
  @IsObject()
  @IsOptional()
  signingKey: SigningKeyDto;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  schemaId: string;

  @IsOptional()
  @IsNotEmpty()
  @IsIn([ProofType.SD_JWT_VC])
  proofType?: ProofType;
}
