import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class ServerStatusQueryDto {
  @ApiProperty({ description: 'Server name (ps, tcs, brick, gaming, cg, vs)', required: false })
  @IsString()
  @IsOptional()
  svname?: string;

  @ApiProperty({ description: 'Comma-separated list of server IDs', required: false, example: '0,1,2' })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (!value) return [];
    return value.split(',').map(id => {
      const parsed = parseInt(id.trim(), 10);
      return isNaN(parsed) ? 0 : parsed;
    });
  })
  ids?: number[];
}

export class PlayerInfoDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  score: number;

  @ApiProperty()
  time: number;
}

export class ServerStatusResponseDto {
  @ApiProperty()
  serverId: number;
  
  @ApiProperty()
  name: string;
  
  @ApiProperty()
  address: string;

  @ApiProperty()
  currentPlayers: number;
  
  @ApiProperty()
  maxPlayers: number;
  
  @ApiProperty()
  currentMap: string;
  
  @ApiProperty()
  uptime: string;
  
  @ApiProperty()
  lastUpdate: string;
  
  @ApiProperty({ enum: ['online', 'offline'] })
  status: 'online' | 'offline';
}

export class ServerDetailedResponseDto extends ServerStatusResponseDto {
  @ApiProperty({ type: [PlayerInfoDto] })
  players: PlayerInfoDto[];
}