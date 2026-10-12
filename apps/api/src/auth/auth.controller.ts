import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';
import { LoginRequest, RefreshRequest, RegisterRequest } from './auth.dto';
import { SessionGuard } from './session.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly sessions: AuthSessionService) {}
  @Post('register') register(@Body() input: RegisterRequest) { return this.auth.register(input); }
  @Post('login') @HttpCode(200) login(@Body() input: LoginRequest) { return this.auth.login(input); }
  @Post('refresh') @HttpCode(200) refresh(@Body() input: RefreshRequest) { return this.auth.refresh(input.refreshToken); }
  @Post('logout') @HttpCode(204) @UseGuards(SessionGuard)
  async logout(@Req() request: any) { await this.sessions.logout(request.headers.authorization.split(' ')[1]); }
}
@Controller('me') @UseGuards(SessionGuard)
export class MeController {
  constructor(private readonly auth: AuthService) {}
  @Get() me(@Req() request: any) { return this.auth.me(request.auth.userId); }
}
