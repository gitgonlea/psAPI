import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class NotifyPaymentDto {
  @ApiProperty({ description: 'MercadoPago payment ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Server name' })
  @IsString()
  @IsNotEmpty()
  svname: string;

  @ApiProperty({ description: 'Server number' })
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  })
  svnum?: number = 0;
}