export interface ServerConfig {
    id: number;
    name: string;
    host: string;
    port: number;
    queryPort?: number; 
  }
  
  export interface ServerConfigWithGroup extends ServerConfig {
    group: string;
  }
  
  export interface ServerGroups {
    [group: string]: ServerConfig[];
  }
  
  export const servers: ServerGroups = {
    'ps': [
      { id: 0, name: 'PUBLICO', host: '45.235.99.105', port: 27047 },
      { id: 1, name: 'PUBLICO II', host: '45.235.99.105', port: 27049 },
      { id: 2, name: 'PUB/FRUTA', host: '45.235.99.105', port: 27052 },
      { id: 3, name: 'AUTOMIX', host: '45.235.98.40', port: 27030 },
    ],
    
    'tcs': [
      { id: 0, name: 'PUBLICO', host: '45.235.99.105', port: 27048 },
      { id: 1, name: 'PUBLICO II', host: '45.235.99.105', port: 27048 },
      { id: 2, name: 'AUTOMIX #1', host: '45.235.98.62', port: 27021 },
      { id: 3, name: 'AUTOMIX #2', host: '45.235.99.18', port: 27015 },
    ],
    
    'brick': [
      { id: 0, name: 'PUBLICO', host: '45.235.98.68', port: 27067 },
      { id: 1, name: 'AUTOMIX', host: '45.235.98.68', port: 27068 }
    ],
    
    'gaming': [
      { id: 0, name: 'PUBLICO', host: '45.235.99.105', port: 27051 },
      { id: 1, name: 'AUTOMIX', host: '45.235.98.64', port: 27022 }
    ],
    
    'vs': [
        { id: 0, name: '#1 PUBLICO', host: '45.235.99.105', port: 27244 },
        { id: 1, name: '#2 AUTOMIX', host: '45.235.99.105', port: 27245 },
        { id: 2, name: '#3 DEATHMATCH', host: '45.235.99.105', port: 27246 },
        { id: 3, name: '#4 FRUTANGA', host: '45.235.99.105', port: 27247 },
        { id: 4, name: '#5 SURF + RESPAWN', host: '45.235.99.105', port: 27248 },
        { id: 5, name: '#6 ZOMBIE PLAGUE CLASICO', host: '45.235.99.105', port: 27249 },
        { id: 6, name: '#7 AUTOMIX 3vs3', host: '45.235.99.105', port: 27248 },
        { id: 7, name: '#8 ONLY INFERNO', host: '45.235.99.105', port: 27515 },
        { id: 8, name: '#9 ZOMBIE PLAGUE + NIVELES', host: '45.235.99.105', port: 27516 },
        { id: 9, name: '#10 BASE BUILDER+LEVELS', host: '45.235.99.105', port: 27517 },
        { id: 10, name: '#11 MATA AL TRAIDOR', host: '45.235.99.105', port: 27518 },
        { id: 11, name: '#12 KZ + BHOP', host: '45.235.99.105', port: 27519 },
        { id: 12, name: '#13 AUTOMIX 2 - RECOIL', host: '45.235.99.105', port: 27520 }
    ],

  };

  export function getAllServers(): ServerConfigWithGroup[] {
    const allServers: ServerConfigWithGroup[] = [];
    
    Object.keys(servers).forEach((group) => {
      servers[group].forEach((server) => {
        allServers.push({
          ...server,
          group: group
        });
      });
    });
    
    return allServers;
  }

  export function getServer(group: string, id: number): ServerConfig | undefined {
    return servers[group]?.find(server => server.id === id);
  }