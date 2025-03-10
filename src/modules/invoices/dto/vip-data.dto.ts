import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class VipData {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  expiration_date: string;

  @IsInt()
  @Min(1)
  days: number;

  @IsInt()
  @Min(1)
  vip: number;

  @IsString()
  @IsOptional()
  info?: string;

  @IsString()
  @IsNotEmpty()
  payment_id: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsOptional()
  total_amount?: number;

  @IsOptional()
  net_amount?: number;

  @IsOptional()
  has_vip?: any;
}