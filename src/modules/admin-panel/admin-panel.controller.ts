import { Controller, Post, Body, UseGuards, Req, Query, Get, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AdminPanelService } from './admin-panel.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { LoginDto, SearchDto } from './dto/admin-panel.dto';
import { Request } from 'express';

@ApiTags('admin-panel')
@Controller('panel')
export class AdminPanelController {
  constructor(private readonly adminPanelService: AdminPanelService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login to admin panel' })
  @ApiResponse({ status: 200, description: 'Login successful', schema: { 
    properties: { 
      message: { type: 'string' }, 
      token: { type: 'string' },
      role: { type: 'string' }
    } 
  }})
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'server', description: 'Server name (ps, tcs, brick, vs)' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @Query('server') server: string,
    @Req() req: Request,
  ) {
    const userIp = req.ip || req.socket.remoteAddress || 'unknown';
    return this.adminPanelService.login(loginDto.password, server, userIp);
  }

  @Get('verify-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify authentication token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'server', description: 'Server name (ps, tcs, brick, vs)' })
  async verifyToken(
    @Req() req: Request,
    @Query('server') server: string,
  ) {
    if (!req.headers.authorization) {
      throw new UnauthorizedException('No token provided');
    }

    const token = req.headers.authorization.replace('Bearer ', '');
    const result = await this.adminPanelService.verifyToken(token, server);
    
    if (!result.valid) {
      throw new UnauthorizedException('Invalid token');
    }

    return { valid: true, role: result.role };
  }

  @Post('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search for player data' })
  @ApiResponse({ status: 200, description: 'Returns player data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'server', description: 'Server name (ps, tcs, brick, vs)' })
  @ApiQuery({ name: 'svnum', description: 'Server number', required: false })
  @ApiBody({ type: SearchDto })
  async search(
    @Body() searchDto: SearchDto,
    @Query('server') server: string,
    @Query('svnum') svnum: string = '0',
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    const token = req.headers.authorization.replace('Bearer ', '');
    const { role } = await this.adminPanelService.verifyToken(token, server);

    if (!role) {
      throw new UnauthorizedException('Invalid token');
    }

    return this.adminPanelService.search(
      searchDto.name,
      server,
      parseInt(svnum, 10),
      clientIp,
      role
    );
  }
}