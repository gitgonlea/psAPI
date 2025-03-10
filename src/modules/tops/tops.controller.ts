import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TopsService } from './tops.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_LIMIT } from '../../throttler-config';

@ApiTags('tops')
@Controller('tops')
@UseGuards(ThrottlerGuard)
export class TopsController {
  constructor(private readonly topsService: TopsService) {}

  @Get('give-rewards/:dbname')
  @ApiOperation({ summary: 'Manually trigger rewards for top players' })
  @ApiResponse({ status: 200, description: 'Rewards distributed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiParam({ name: 'dbname', description: 'Database ID' })
  async giveRewards(@Param('dbname') dbname: string) {
    await this.topsService.giveRewards(parseInt(dbname, 10));
    return { message: 'Rewards distribution triggered' };
  }
}