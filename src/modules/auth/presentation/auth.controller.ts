import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../application/access-token.service';
import { GetCurrentUserUseCase } from '../application/get-current-user.use-case';
import { RefreshSessionUseCase } from '../application/refresh-session.use-case';
import { SessionTokens } from '../application/session-issuer';
import { SignInAnonymouslyUseCase } from '../application/sign-in-anonymously.use-case';
import { User } from '../domain/user';
import { CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';
import { RefreshSessionDto } from './refresh-session.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly signInAnonymously: SignInAnonymouslyUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('anonymous')
  createAnonymousSession(): Promise<SessionTokens> {
    return this.signInAnonymously.execute();
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshSessionDto): Promise<SessionTokens> {
    return this.refreshSession.execute(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<User> {
    return this.getCurrentUser.execute(user.userId);
  }
}
