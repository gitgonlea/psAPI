import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DB_CONNECTION_FACTORY } from '../../database/database.providers';
import { ServerStatusResponseDto } from './dto/servers.status.dto';
import { SourceQueryService } from './services/source-query.service';
import { servers } from '../../config/servers.config';

const STATUS_DATABASE_ID = 1;

interface ServerInfo {
  id: number;
  name: string;
  group: string;
  host: string;
  port: number;
  queryPort: number;
  status: 'online' | 'offline';
  currentPlayers: number;
  maxPlayers: number;
  currentMap: string;
  uptime: string;
  lastUpdate: Date;
}

@Injectable()
export class ServersService {
  private readonly logger = new Logger(ServersService.name);
  private serverCache: Map<string, ServerInfo[]> = new Map();

  constructor(
    @Inject(DB_CONNECTION_FACTORY)
    private readonly dbConnectionFactory: (dbId: number) => Promise<any>,
    private readonly sourceQueryService: SourceQueryService,
  ) {
    this.initializeServerCache();
    
    this.loadServersFromDatabase().then(() => {
      this.updateServerStatus();
    });
  }

  private initializeServerCache(): void {
    this.serverCache.clear();
    
    const serverGroups = Object.keys(servers);
    
    for (const group of serverGroups) {
      const serverList: ServerInfo[] = servers[group].map(server => ({
        id: server.id,
        name: server.name,
        group: group,
        host: server.host,
        port: server.port,
        queryPort: server.queryPort || server.port,
        status: 'offline',
        currentPlayers: 0,
        maxPlayers: 32,
        currentMap: 'Unknown',
        uptime: 'Online',
        lastUpdate: new Date()
      }));
      
      this.serverCache.set(group, serverList);
    }
    
    this.logger.log('Server cache initialized from config file');
  }

  private async loadServersFromDatabase(): Promise<void> {
    try {
      const pool = await this.dbConnectionFactory(STATUS_DATABASE_ID);
      
      try {
        const [servers] = await pool.execute('SELECT * FROM server_status ORDER BY server_group, server_id');
        
        if (servers.length === 0) {
          this.logger.warn('No servers found in database');
          return;
        }
        
        for (const server of servers) {
          const groupServers = this.serverCache.get(server.server_group) || [];
          const existingServer = groupServers.find(s => s.id === server.server_id);
          
          if (existingServer) {
            existingServer.name = server.server_name;
            existingServer.host = server.host;
            existingServer.port = server.port;
            existingServer.queryPort = server.query_port || server.port;
            existingServer.status = server.is_online ? 'online' : 'offline';
            existingServer.currentPlayers = server.playercount || 0;
            existingServer.maxPlayers = server.maxplayers || 32;
            existingServer.currentMap = server.map || 'Unknown';
            existingServer.uptime = server.uptime || 'Online';
            existingServer.lastUpdate = server.last_check || new Date();
          } else {
            const newServer: ServerInfo = {
              id: server.server_id,
              name: server.server_name,
              group: server.server_group,
              host: server.host,
              port: server.port,
              queryPort: server.query_port || server.port,
              status: server.is_online ? 'online' : 'offline',
              currentPlayers: server.playercount || 0,
              maxPlayers: server.maxplayers || 32,
              currentMap: server.map || 'Unknown',
              uptime: server.uptime || 'Online',
              lastUpdate: server.last_check || new Date()
            };
            
            groupServers.push(newServer);
            this.serverCache.set(server.server_group, groupServers);
          }
        }
        
        this.logger.log(`Loaded ${servers.length} servers from database`);

        for (const [group, servers] of this.serverCache.entries()) {
          this.logger.log(`Group ${group} has ${servers.length} servers loaded`);
          servers.forEach(s => this.logger.log(`- ${s.name} (${s.host}:${s.port})`));
        }
      } catch (error) {
        this.logger.error(`Database query failed: ${error.message}`);
      } finally {
        pool.end();
      }
    } catch (error) {
      this.logger.error(`Could not connect to database: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateServerStatus(): Promise<void> {
    this.logger.log('Updating server status...');
    
    try {
      const allServers: ServerInfo[] = [];
      for (const group of this.serverCache.keys()) {
        const servers = this.serverCache.get(group) || [];
        allServers.push(...servers);
      }
      
      this.logger.log(`Found ${allServers.length} servers to update`);
      
      for (const server of allServers) {
        try {
          this.logger.log(`Querying server ${server.group}/${server.id} (${server.host}:${server.port})`);
          
          const queryResult = await this.sourceQueryService.queryServer(server.host, server.port);
          
          if (queryResult.success) {
            server.status = 'online';
            server.name = queryResult.name || server.name;
            server.currentPlayers = queryResult.players || 0;
            server.maxPlayers = queryResult.maxPlayers || 32;
            server.currentMap = queryResult.map || 'Unknown';
            server.uptime = 'Online';
            
            this.logger.log(`Server ${server.group}/${server.id} is ONLINE with ${server.currentPlayers}/${server.maxPlayers} players on ${server.currentMap}`);
          } else {
            server.status = 'offline';
            this.logger.log(`Server ${server.group}/${server.id} is OFFLINE: ${queryResult.error}`);
          }
          
          server.lastUpdate = new Date();
        } catch (error) {
          this.logger.warn(`Failed to query server ${server.group}/${server.id}: ${error.message}`);
          server.status = 'offline';
          server.lastUpdate = new Date();
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const pool = await this.dbConnectionFactory(STATUS_DATABASE_ID);
      
      try {
        for (const server of allServers) {
          this.logger.log(`Updating database for ${server.group}/${server.id} (${server.status})`);
          
          await pool.execute(`
            UPDATE server_status 
            SET is_online = ?, 
                playercount = ?, 
                maxplayers = ?, 
                map = ?, 
                uptime = ?, 
                last_check = NOW() 
            WHERE server_group = ? AND server_id = ?
          `, [
            server.status === 'online', 
            server.currentPlayers, 
            server.maxPlayers, 
            server.currentMap, 
            server.uptime, 
            server.group, 
            server.id
          ]);
        }
        
        this.logger.log('Database updated with latest server status');
      } catch (error) {
        this.logger.error(`Database update failed: ${error.message}`);
      } finally {
        pool.end();
      }
    } catch (error) {
      this.logger.error(`Error updating server status: ${error.message}`);
    }
    
    this.logger.log('Server status update completed');
  }

  async getServerStatus(svname?: string, ids?: number[]): Promise<ServerStatusResponseDto[]> {
    if (!svname) {
      const allServers: ServerStatusResponseDto[] = [];
      
      for (const [groupName, servers] of this.serverCache.entries()) {
        for (const server of servers) {
          allServers.push(this.mapServerToResponse(server));
        }
      }
      
      return allServers;
    } else {
      const servers = this.serverCache.get(svname) || [];
      
      if (ids && ids.length > 0) {
        return servers
          .filter(server => ids.includes(server.id))
          .map(server => this.mapServerToResponse(server));
      }
      
      return servers.map(server => this.mapServerToResponse(server));
    }
  }

  private mapServerToResponse(server: ServerInfo): ServerStatusResponseDto {
    return {
      serverId: server.id,
      name: server.name,
      address: `${server.host}:${server.port}`,
      currentPlayers: server.currentPlayers,
      maxPlayers: server.maxPlayers,
      currentMap: server.currentMap,
      uptime: server.uptime,
      lastUpdate: server.lastUpdate.toISOString(),
      status: server.status
    };
  }

  async refreshServerStatus(): Promise<void> {
    await this.updateServerStatus();
  }
}