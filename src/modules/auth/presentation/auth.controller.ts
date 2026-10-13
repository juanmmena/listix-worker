import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../application/access-token.service';
import { AuthService } from '../application/auth.service';
import { SessionTokens } from '../application/session-issuer';
import { User } from '../domain/user';
import { CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';
import { RefreshSessionDto } from './refresh-session.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('anonymous')
  createAnonymousSession(): Promise<SessionTokens> {
    return this.authService.signInAnonymously();
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshSessionDto): Promise<SessionTokens> {
    return this.authService.refreshSession(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<User> {
    return this.authService.getCurrentUser(user.userId);
  }
}
