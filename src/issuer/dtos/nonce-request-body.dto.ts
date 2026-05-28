import { IsNotEmpty, IsNumberString } from 'class-validator';

export class NonceRequestBodyDto {
  @IsNumberString()
  @IsNotEmpty()
  nonce: string;
}
