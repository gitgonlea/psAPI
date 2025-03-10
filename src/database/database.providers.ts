import { Provider } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { dbConnections, getDbConnectionById } from './db.config';

export const createDBPool = async (dbId: number): Promise<mysql.Pool> => {
  const connectionDetails = getDbConnectionById(dbId);
  
  if (!connectionDetails) {
    throw new Error(`Invalid database ID: ${dbId}`);
  }
  
  const [host, username, password, database] = connectionDetails;
  
  return mysql.createPool({
    host,
    user: username,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
};

export const DB_CONNECTION_FACTORY = 'DB_CONNECTION_FACTORY';

export const databaseProviders: Provider[] = [
  {
    provide: DB_CONNECTION_FACTORY,
    useFactory: () => {
      return (dbId: number) => createDBPool(dbId);
    },
  },
];