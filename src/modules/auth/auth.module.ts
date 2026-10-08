import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { Env } from '../../config/env.schema';
import { AccessTokenService } from './application/access-token.service';
import { GetCurrentUserUseCase } from './application/get-current-user.use-case';
import { RefreshSessionUseCase } from './application/refresh-session.use-case';
import { AUTH_SETTINGS, AuthSettings, SessionIssuer } from './application/session-issuer';
import { SignInAnonymouslyUseCase } from './application/sign-in-anonymously.use-case';
import { RefreshTokenRepository, UserRepository } from './domain/repositories';
import { JwtAccessTokenService } from './infrastructure/jwt-access-token.service';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma-refresh-token.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: AccessTokenService, useClass: JwtAccessTokenService },
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: RefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
    {
      provide: AUTH_SETTINGS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): AuthSettings => ({
        refreshTokenTtlDays: config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }),
      }),
    },
    SessionIssuer,
    SignInAnonymouslyUseCase,
    RefreshSessionUseCase,
    GetCurrentUserUseCase,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AccessTokenService],
})
export class AuthModule {}
