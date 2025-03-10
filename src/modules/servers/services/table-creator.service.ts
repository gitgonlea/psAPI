import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { DB_CONNECTION_FACTORY } from '../../../database/database.providers';
import { ConfigService } from '@nestjs/config';
import { servers } from '../../../config/servers.config';

// Define which database ID will store the server status information
const STATUS_DATABASE_ID = 1; // PS main database (you can change this to any database ID you prefer)

@Injectable()
export class TableCreatorService implements OnModuleInit {
  private readonly logger = new Logger(TableCreatorService.name);

  constructor(
    @Inject(DB_CONNECTION_FACTORY)
    private readonly dbConnectionFactory: (dbId: number) => Promise<any>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create database tables when module initializes
   */
  async onModuleInit(): Promise<void> {
    this.logger.log(`Checking if server_status table exists in database ID ${STATUS_DATABASE_ID}...`);
    
    try {
      const pool = await this.dbConnectionFactory(STATUS_DATABASE_ID);
      
      try {
        // Check if table exists
        const [tables] = await pool.execute(`
          SELECT * 
          FROM information_schema.tables
          WHERE table_name = 'server_status'
        `);
        
        if (tables.length === 0) {
          this.logger.log(`Creating server_status table in database ID ${STATUS_DATABASE_ID}...`);
          await this.createServerStatusTable(pool);
          await this.insertInitialData(pool);
        } else {
          this.logger.log(`server_status table already exists in database ID ${STATUS_DATABASE_ID}`);
          
          // Optionally, update server information if it already exists
          await this.updateServerInformation(pool);
        }
      } catch (error) {
        this.logger.error(`Error checking/creating table: ${error.message}`);
      } finally {
        pool.end();
      }
    } catch (error) {
      this.logger.error(`Could not connect to database ID ${STATUS_DATABASE_ID}: ${error.message}`);
    }
  }

  /**
   * Create server_status table in the database
   */
  private async createServerStatusTable(pool: any): Promise<void> {
    try {
      await pool.execute(`
        CREATE TABLE server_status (
          id INT AUTO_INCREMENT PRIMARY KEY,
          server_id INT NOT NULL,
          server_name VARCHAR(255) NOT NULL,
          server_group VARCHAR(50) NOT NULL,
          host VARCHAR(50) NOT NULL,
          port INT DEFAULT 27015,
          query_port INT DEFAULT 27015,
          playercount INT DEFAULT 0,
          maxplayers INT DEFAULT 32,
          map VARCHAR(100) DEFAULT 'Unknown',
          uptime VARCHAR(100) DEFAULT '0h 0m',
          is_online BOOLEAN DEFAULT false,
          last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_server_id (server_id),
          INDEX idx_server_group (server_group),
          UNIQUE KEY idx_unique_server (server_group, server_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      
      this.logger.log(`Successfully created server_status table in database ID ${STATUS_DATABASE_ID}`);
    } catch (error) {
      this.logger.error(`Error creating server_status table: ${error.message}`);
      throw error;
    }
  }

  /**
   * Insert initial data for all servers
   */
  private async insertInitialData(pool: any): Promise<void> {
    try {
      // Get all servers from the configuration file
      const serverGroups = Object.keys(servers);
      
      // Insert each server
      for (const group of serverGroups) {
        for (const server of servers[group]) {
          await pool.execute(`
            INSERT INTO server_status 
            (server_id, server_name, server_group, host, port, query_port) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            server.id, 
            server.name, 
            group, 
            server.host, 
            server.port, 
            server.queryPort || server.port
          ]);
          
          this.logger.log(`Added ${group} server ${server.id} (${server.name}) to status tracking`);
        }
      }
      
      this.logger.log('Successfully inserted initial server data');
    } catch (error) {
      this.logger.error(`Error inserting initial data: ${error.message}`);
    }
  }

  /**
   * Update server information if it already exists
   * This ensures that any changes in the config file are applied to the database
   */
  private async updateServerInformation(pool: any): Promise<void> {
    try {
      const serverGroups = Object.keys(servers);
      
      for (const group of serverGroups) {
        for (const server of servers[group]) {
          // Check if this server exists in the database
          const [exists] = await pool.execute(
            'SELECT id FROM server_status WHERE server_group = ? AND server_id = ?',
            [group, server.id]
          );
          
          if (exists.length > 0) {
            // Update existing server
            await pool.execute(`
              UPDATE server_status 
              SET server_name = ?, host = ?, port = ?, query_port = ?
              WHERE server_group = ? AND server_id = ?
            `, [
              server.name,
              server.host,
              server.port,
              server.queryPort || server.port,
              group,
              server.id
            ]);
            
            this.logger.log(`Updated ${group} server ${server.id} (${server.name}) information`);
          } else {
            // Insert new server
            await pool.execute(`
              INSERT INTO server_status 
              (server_id, server_name, server_group, host, port, query_port) 
              VALUES (?, ?, ?, ?, ?, ?)
            `, [
              server.id, 
              server.name, 
              group, 
              server.host, 
              server.port, 
              server.queryPort || server.port
            ]);
            
            this.logger.log(`Added new ${group} server ${server.id} (${server.name}) to status tracking`);
          }
        }
      }
      
      this.logger.log('Server information updated successfully');
    } catch (error) {
      this.logger.error(`Error updating server information: ${error.message}`);
    }
  }
}