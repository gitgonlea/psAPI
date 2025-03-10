import { Module, Global } from '@nestjs/common';
import { databaseProviders } from './database.providers';
import { DatabaseHelper } from './database.helper';

@Global()
@Module({
  providers: [...databaseProviders, DatabaseHelper],
  exports: [...databaseProviders, DatabaseHelper],
})
export class DatabaseModule {}