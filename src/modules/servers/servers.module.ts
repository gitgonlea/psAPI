import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ServersController } from './servers.controllers';
import { ServersService } from './servers.service';
import { TableCreatorService } from './services/table-creator.service';
import { SourceQueryService } from './services/source-query.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ServersController],
  providers: [ServersService, TableCreatorService, SourceQueryService],
  exports: [ServersService],
})
export class ServersModule {}