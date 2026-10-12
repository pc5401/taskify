import { Module } from '@nestjs/common';
import { AccessTokenService } from './access-token.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { AuthSessionService } from './auth-session.service';
import { SessionGuard } from './session.guard';
import { AuthController, MeController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

@Module({
  imports: [PersistenceModule],
  controllers: [AuthController, MeController],
  providers: [AuthService, PasswordService, AuthSessionService, SessionGuard, { provide: AccessTokenService, useFactory: () => {
    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) throw new Error('AUTH_JWT_SECRET must contain at least 32 bytes');
    return new AccessTokenService(secret);
  } }],
  exports: [AuthSessionService, SessionGuard],
})
export class AuthSessionModule {}
