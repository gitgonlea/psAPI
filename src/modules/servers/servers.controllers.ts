import { Controller, Get, Query, UseGuards, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ServersService } from './servers.service';
import { ServerStatusQueryDto, ServerStatusResponseDto } from './dto/servers.status.dto';

@ApiTags('servers')
@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Get('status')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Get game server status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns game server status information',
    type: [ServerStatusResponseDto]
  })
  @ApiQuery({ name: 'svname', required: false, description: 'Server name (ps, tcs, brick, gaming, cg, vs)' })
  @ApiQuery({ name: 'ids', required: false, description: 'Comma-separated list of server IDs' })
  async getServerStatus(@Query() query: ServerStatusQueryDto): Promise<ServerStatusResponseDto[]> {
    return this.serversService.getServerStatus(query.svname, query.ids);
  }

  @Post('refresh')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force refresh server status' })
  @ApiResponse({ status: 200, description: 'Server status refreshed' })
  async refreshServerStatus(): Promise<{ message: string }> {
    await this.serversService.refreshServerStatus();
    return { message: 'Server status refreshed successfully' };
  }
}