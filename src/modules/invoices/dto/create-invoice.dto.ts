import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Username of the player' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Subscription month index (0-4)', minimum: 0, maximum: 4 })
  @IsInt()
  @Min(0)
  @Max(4)
  month: number;

  @ApiProperty({ description: 'VIP level index (0-8)', minimum: 0, maximum: 8 })
  @IsInt()
  @Min(0)
  @Max(8)
  vip: number;

  @ApiProperty({ description: 'Server name (ps, tcs, brick, gaming, cg, vs)' })
  @IsString()
  @IsNotEmpty()
  svname: string;

  @ApiProperty({ description: 'Server number' })
  @IsInt()
  @Min(0)
  server: number;
}