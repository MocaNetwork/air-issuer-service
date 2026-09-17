import { IsISO8601, IsNotEmpty, IsObject, IsOptional, IsString, ValidateBy } from 'class-validator';

const RESERVED_CLAIMS = ['cnf', 'exp', 'iat', 'id', 'iss', 'nonce', 'status', 'sub', 'vct', 'vct#integrity'];

export class AdminIssueVcRequestBodyDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  schemaId: string;

  @IsISO8601()
  @ValidateBy(
    {
      name: 'isFutureDate',
      validator: { validate: (value: string) => new Date(value).getTime() > Date.now() },
    },
    { message: 'expiration must be a future date' },
  )
  expiration: string;

  @IsString()
  @IsNotEmpty()
  vct: string;

  @IsObject()
  @ValidateBy(
    {
      name: 'hasNoReservedClaims',
      validator: {
        validate: (value: object) => !Object.keys(value ?? {}).some((key) => RESERVED_CLAIMS.includes(key)),
      },
    },
    { message: `credentialSubject must not contain the reserved claims: ${RESERVED_CLAIMS.join(', ')}` },
  )
  credentialSubject: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  disclosureFrame?: Record<string, unknown>;
}
