import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const server = request.query.server;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    let secretKey: string;
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

    try {
      jwt.verify(token, secretKey);
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}