import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminPanelController } from './admin-panel.controller';
import { AdminPanelService } from './admin-panel.service';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET_KEY', 'fallbackSecretForDevelopmentOnly'),
        signOptions: { 
          expiresIn: configService.get<string>('JWT_EXPIRATION', '1h') 
        },
      }),
    }),
  ],
  controllers: [AdminPanelController],
  providers: [AdminPanelService],
})
export class AdminPanelModule {}