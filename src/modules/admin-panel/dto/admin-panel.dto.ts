import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Admin password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SearchDto {
  @ApiProperty({ description: 'Username to search for' })
  @IsString()
  @IsNotEmpty()
  name: string;
}