import { Module } from '@nestjs/common';
import { AccessTokenService } from './access-token.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { AuthSessionService } from './auth-session.service';
import { SessionGuard } from './session.guard';

// Import when adding authenticated HTTP routes. No login/registration route yet.
@Module({
  imports: [PersistenceModule],
  providers: [AuthSessionService, SessionGuard, { provide: AccessTokenService, useFactory: () => {
    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) throw new Error('AUTH_JWT_SECRET must contain at least 32 bytes');
    return new AccessTokenService(secret);
  } }],
  exports: [AuthSessionService, SessionGuard],
})
export class AuthSessionModule {}
