import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class MercadoPagoMetadata {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsInt()
  @Min(1)
  days: number;

  @IsInt()
  @Min(1)
  month: number;

  @IsInt()
  @Min(1)
  vip: number;

  @IsString()
  @IsNotEmpty()
  randomId: string;
}