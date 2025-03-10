import { Injectable, Inject, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { DB_CONNECTION_FACTORY } from '../../database/database.providers';
import { DatabaseHelper } from '../../database/database.helper';

@Injectable()
export class AdminPanelService {
  private readonly logger = new Logger(AdminPanelService.name);
  private readonly loginAttempts: Record<string, { count: number, lastAttempt: number }> = {};
  private readonly blockedIps: Record<string, { blockedUntil: number }> = {};
  
  constructor(
    @Inject(DB_CONNECTION_FACTORY)
    private readonly dbConnectionFactory: (dbId: number) => Promise<any>,
    private readonly databaseHelper: DatabaseHelper,
    private readonly jwtService: JwtService,
  ) {}

  private isIpBlocked(ip: string): boolean {
    if (!this.blockedIps[ip]) return false;
    
    const now = Date.now();
    if (now < this.blockedIps[ip].blockedUntil) {
      return true;
    }
    
    delete this.blockedIps[ip];
    return false;
  }

  async login(password: string, server: string, userIp: string): Promise<{ message: string, token: string, role: string }> {
    if (this.isIpBlocked(userIp)) {
      throw new UnauthorizedException('Too many failed attempts. Try again later.');
    }

    if (!this.loginAttempts[userIp]) {
      this.loginAttempts[userIp] = { count: 0, lastAttempt: Date.now() };
    } else {
      if (Date.now() - this.loginAttempts[userIp].lastAttempt > 3600000) {
        this.loginAttempts[userIp] = { count: 0, lastAttempt: Date.now() };
      } else {
        this.loginAttempts[userIp].lastAttempt = Date.now();
      }
    }

    let serverConfig;
    switch (server) {
      case 'tcs':
        serverConfig = {
          hashedPassword: process.env.HASHED_PASSWORD_TCS,
          secretKey: process.env.SECRET_KEY_TCS,
          adminPassword: process.env.ADMIN_PASSWORD_TCS,
        };
        break;
      case 'brick':
        serverConfig = {
          hashedPassword: process.env.HASHED_PASSWORD_BRICK,
          secretKey: process.env.SECRET_KEY_BRICK,
          adminPassword: process.env.ADMIN_PASSWORD_BRICK,
        };
        break;
      case 'vs':
        serverConfig = {
          hashedPassword: process.env.HASHED_PASSWORD_VS,
          secretKey: process.env.SECRET_KEY_VS,
          adminPassword: process.env.ADMIN_PASSWORD_VS,
        };
        break;
      case 'ps':
        serverConfig = {
          hashedPassword: process.env.HASHED_PASSWORD_PS,
          secretKey: process.env.SECRET_KEY_PS,
          adminPassword: process.env.ADMIN_PASSWORD_PS,
        };
        break;
      default:
        throw new UnauthorizedException('Invalid server');
    }

    if (!serverConfig.hashedPassword || !serverConfig.secretKey) {
      this.logger.error(`Missing configuration for server: ${server}`);
      throw new UnauthorizedException('Server configuration error');
    }

    let isAdmin = false;
    let passwordValid = false;

    if (serverConfig.adminPassword && password === serverConfig.adminPassword) {
      isAdmin = true;
      passwordValid = true;
    } else {
      try {
        passwordValid = await bcrypt.compare(password, serverConfig.hashedPassword);
      } catch (error) {
        this.logger.error(`Bcrypt error: ${error.message}`);
      }
    }

    if (!passwordValid) {
      this.loginAttempts[userIp].count += 1;

      if (this.loginAttempts[userIp].count >= 3) {
        const blockUntil = Date.now() + 3600000;
        this.blockedIps[userIp] = { blockedUntil: blockUntil };
        this.loginAttempts[userIp].count = 0;
        
        this.logger.warn(`IP ${userIp} blocked until ${new Date(blockUntil).toISOString()}`);
        throw new UnauthorizedException('Too many failed attempts. Try again later.');
      }

      throw new UnauthorizedException('Incorrect password');
    }

    this.loginAttempts[userIp].count = 0;

    const payload = { role: isAdmin ? 'admin' : 'staff', server };
    const token = this.jwtService.sign(payload, { 
      secret: serverConfig.secretKey, 
      expiresIn: '1h' 
    });

    this.logger.log(`Successful login for ${userIp} with role ${payload.role} on server ${server}`);
    
    return { 
      message: 'Login successful', 
      token, 
      role: payload.role 
    };
  }
  async verifyToken(token: string, server: string): Promise<{ valid: boolean, role: string }> {
    try {
      let secretKey;
      switch (server) {
        case 'tcs':
          secretKey = process.env.SECRET_KEY_TCS;
          break;
        case 'brick':
          secretKey = process.env.SECRET_KEY_BRICK;
          break;
        case 'vs':
          secretKey = process.env.SECRET_KEY_VS;
          break;
        case 'ps':
          secretKey = process.env.SECRET_KEY_PS;
          break;
        default:
          throw new UnauthorizedException('Invalid server');
      }

      if (!secretKey) {
        throw new Error('Secret key not configured');
      }

      const decoded = this.jwtService.verify(token, { secret: secretKey });
      return { valid: true, role: decoded.role || 'staff' };
    } catch (error) {
      this.logger.warn(`Token verification failed: ${error.message}`);
      return { valid: false, role: 'none' };
    }
  }

  private async ensureLogFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch (error) {
      const dir = path.dirname(filePath);
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (err) {
      }
      await fs.writeFile(filePath, '');
    }
  }

  private async logQuery(logEntry: string, server: string): Promise<void> {
    const logsDir = path.join(process.cwd(), 'logs');
    const logFilePath = path.join(logsDir, `search_${server.toUpperCase()}.txt`);
    
    await this.ensureLogFileExists(logFilePath);
    await fs.appendFile(logFilePath, logEntry);
  }

  async search(name: string, server: string, servernum: number, clientIp: string, userRole: string): Promise<any[]> {
    try {
      const logEntry = `${new Date().toISOString()} - IP: ${clientIp} | Role: ${userRole} | Search: ${name} | Server: ${server}${servernum}\n`;
      await this.logQuery(logEntry, server);

      const results = await this.getDataFromUser(name, server, servernum);

      return this.filterResultsByRole(results, userRole);
    } catch (error) {
      this.logger.error(`Error in search: ${error.message}`, error.stack);
      throw error;
    }
  }

  private filterResultsByRole(results: any[], role: string): any[] {
    if (role === 'admin') {
      return results;
    } else {
      return results.map(user => {
        const { Pw, ...rest } = user;
        return rest;
      });
    }
  }

  private async getDataFromUser(username: string, svname: string, svnum: number): Promise<any[]> {
    let dbname: number;
    
    if (svname === 'ps') {
      dbname = svnum === 0 ? 0 : svnum === 1 ? 1 : 5;
    } else if (svname === 'cg') {
      dbname = 11;
    } else if (svname === 'vs') {
      dbname = 8;
    } else if (svname === 'tcs') {
      dbname = svnum === 1 ? 3 : 2;
    } else if (svname === 'brick') {
      dbname = 4;
    } else if (svname === 'gaming') {
      dbname = 7;
    } else {
      if (svnum === 1) dbname = 1;
      else if (svnum === 0) dbname = 0;
      else if (svnum === 2) dbname = 6;
      else if (svnum === 3) dbname = 5;
    }
    
    if (!username) {
      return [];
    }
    
    return this.databaseHelper.executeQueryById(
      dbname,
      `SELECT id, Tag, Pw, Contacto, Nivel, Fecha, IP FROM publvl WHERE Tag LIKE ?`,
      [`%${username}%`]
    );
  }
}