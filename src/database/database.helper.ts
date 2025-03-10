import { Injectable, Inject, Logger } from '@nestjs/common';
import { DB_CONNECTION_FACTORY } from './database.providers';
import { getDbIdForServer } from './db.config';

@Injectable()
export class DatabaseHelper {
  private readonly logger = new Logger(DatabaseHelper.name);

  constructor(
    @Inject(DB_CONNECTION_FACTORY)
    private readonly dbConnectionFactory: (dbId: number) => Promise<any>,
  ) {}

  async executeQuery(svname: string, svnum: number, query: string, params: any[] = []): Promise<any> {
    const dbId = getDbIdForServer(svname, svnum);
    
    if (dbId === -1) {
      this.logger.error(`Invalid server: ${svname} ${svnum}`);
      throw new Error(`Invalid server: ${svname} ${svnum}`);
    }
    
    return this.executeQueryById(dbId, query, params);
  }

  async executeQueryById(dbId: number, query: string, params: any[] = []): Promise<any> {
    let pool = null;
    
    try {
      pool = await this.dbConnectionFactory(dbId);
      const [results] = await pool.execute(query, params);
      return results;
    } catch (error) {
      this.logger.error(`Database error: ${error.message}`, error.stack);
      throw error;
    } finally {
      if (pool) {
        pool.end().catch(err => {
          this.logger.error(`Error closing pool: ${err.message}`);
        });
      }
    }
  }

  getDbId(svname: string, svnum: number): number {
    return getDbIdForServer(svname, svnum);
  }

  getDbForPayments(svname: string): number {
    let dbId: number;
    
    switch (svname) {
      case 'cg':
        dbId = 11;
        break;
      case 'vs':
        dbId = 8;
        break;
      case 'tcs':
        dbId = 2;
        break;
      case 'ps':
        dbId = 1;
        break;
      case 'gaming':
        dbId = 7;
        break;
      case 'brick':
        dbId = 4;
        break;
      default:
        dbId = 1;
    }
    
    return dbId;
  }
}