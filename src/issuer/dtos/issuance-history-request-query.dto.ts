import { IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsPositive, IsString, Max } from 'class-validator';

export class IssuanceHistoryRequestQueryDto {
  @IsOptional()
  @IsNumber()
  @IsPositive({})
  page?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(100)
  limit?: number;

  @IsOptional()
  order?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  holderDid?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  schemaId?: string;

  @IsOptional()
  @IsNumberString()
  revocationNonce?: string;
}
