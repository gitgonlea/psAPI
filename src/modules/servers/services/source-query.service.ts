import { Injectable, Logger } from '@nestjs/common';
const SourceQuery = require('sourcequery');

export interface ServerQueryResult {
  success: boolean;
  name?: string;
  map?: string;
  players?: number;
  maxPlayers?: number;
  error?: string;
}

// Define type for SourceQuery response
interface SourceQueryInfo {
  name: string;
  map: string;
  players: number;
  maxplayers: number;
  bots?: number;
  protocol?: number;
  folder?: string;
  game?: string;
  appid?: number;
  [key: string]: any; // Allow for any additional properties
}

@Injectable()
export class SourceQueryService {
  private readonly logger = new Logger(SourceQueryService.name);

  /**
   * Query a Counter-Strike 1.6 server using sourcequery
   * @param host Server IP address
   * @param port Server port
   * @returns Server information or error
   */
  async queryServer(host: string, port: number): Promise<ServerQueryResult> {
    const sq = new SourceQuery(1000); // 1000ms timeout

    const getInfo = (): Promise<SourceQueryInfo> => {
      return new Promise((resolve, reject) => {
        sq.getInfo((err: Error, info: SourceQueryInfo) => {
          if (err) return reject(err);
          resolve(info);
        });
      });
    };

    try {
      this.logger.log(`Querying server ${host}:${port}`);
      sq.open(host, port);
      
      const info = await getInfo();
      this.logger.log(`Query successful for ${host}:${port}: ${JSON.stringify(info)}`);
      
      return {
        success: true,
        name: info.name,
        map: info.map,
        players: info.players,
        maxPlayers: info.maxplayers,
      };
    } catch (error) {
      this.logger.warn(`Failed to query server ${host}:${port}: ${error.message || error.msg || 'Unknown error'}`);
      return {
        success: false,
        error: error.message || error.msg || 'Unknown error'
      };
    } finally {
      sq.close();
    }
  }

  /**
   * Check if server is online
   * @param host Server hostname or IP
   * @param port Server port
   * @returns True if server is online
   */
  async isServerOnline(host: string, port: number): Promise<boolean> {
    try {
      const result = await this.queryServer(host, port);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Return a simple uptime string
   */
  getServerUptime(): string {
    return 'Online';
  }
}