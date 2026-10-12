import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthSessionService } from './auth-session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: AuthSessionService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization;
    const match = typeof header === 'string' && /^Bearer ([^\s]+)$/i.exec(header);
    if (!match) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Authentication required', details: {} });
    request.auth = await this.sessions.authenticate(match[1]);
    return true;
  }
}
