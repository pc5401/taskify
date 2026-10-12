import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';
import { AuthSessionService } from './auth-session.service';
import { PasswordService } from './password.service';
import { LoginRequest, RegisterRequest } from './auth.dto';
import { fail } from '../common/if-match';

export const publicUser = (user: any) => ({ id: user.id, email: user.email, nickname: user.nickname,
  avatarUrl: user.avatarUrl, createdAt: user.createdAt });

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly sessions: AuthSessionService,
    private readonly passwords: PasswordService) {}

  async register(input: RegisterRequest) {
    const passwordHash = await this.passwords.hash(input.password);
    // User + initial auth session are one transaction: issuance failure leaves no user.
    return this.prisma.$transaction(async tx => {
      let user;
      try {
        user = await tx.user.create({ data: { email: input.email, nickname: input.nickname, passwordHash } });
      } catch (error) {
        if (error?.code === 'P2002') fail(409, 'EMAIL_TAKEN');
        throw error;
      }
      const tokens = await this.sessions.issueForAuthenticatedUser(user.id, tx);
      return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: publicUser(user) };
    });
  }
  async login(input: LoginRequest) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    // Perform the same KDF for unknown accounts; never expose existence in errors.
    const hash = user?.passwordHash ?? 'scrypt-v1$00000000000000000000000000000000$' + '0'.repeat(128);
    const valid = await this.passwords.verify(input.password, hash);
    if (!user || !valid) fail(401, 'INVALID_CREDENTIALS');
    const tokens = await this.sessions.issueForAuthenticatedUser(user.id);
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: publicUser(user) };
  }
  async refresh(refreshToken: string) {
    const tokens = await this.sessions.refresh(refreshToken);
    const identity = await this.sessions.authenticate(tokens.accessToken);
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: await this.me(identity.userId) };
  }
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) fail(401, 'UNAUTHENTICATED');
    return publicUser(user);
  }
}
