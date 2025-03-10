import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { TopsModule } from './modules/tops/tops.module';
import { AdminPanelModule } from './modules/admin-panel/admin-panel.module';
import { ServersModule } from './modules/servers/servers.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    ThrottlerModule.forRoot(),
    
    ScheduleModule.forRoot(),
    
    DatabaseModule,
    
    InvoicesModule,
    TopsModule,
    AdminPanelModule,
    ServersModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}