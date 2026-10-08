import { Inject, Injectable } from '@nestjs/common';
import { CryptoService } from '../../../shared/application/crypto.service';
import { Clock } from '../../../shared/domain/clock';
import { addDays } from '../../../shared/domain/time';
import { RefreshToken } from '../domain/refresh-token';
import { RefreshTokenRepository } from '../domain/repositories';
import { AccessTokenService } from './access-token.service';

export const AUTH_SETTINGS = Symbol('AUTH_SETTINGS');

export interface AuthSettings {
  refreshTokenTtlDays: number;
}

export interface SessionTokens {
  userId: string;
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class SessionIssuer {
  constructor(
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly crypto: CryptoService,
    private readonly clock: Clock,
    @Inject(AUTH_SETTINGS) private readonly settings: AuthSettings,
  ) {}

  async issue(userId: string): Promise<SessionTokens> {
    const refreshToken = this.crypto.randomHex(32);
    const refreshTokenExpiresAt = addDays(this.clock.now(), this.settings.refreshTokenTtlDays);
    await this.refreshTokens.create(
      new RefreshToken(
        this.crypto.uuid(),
        userId,
        this.crypto.sha256Hex(refreshToken),
        refreshTokenExpiresAt,
        null,
      ),
    );
    return {
      userId,
      accessToken: await this.accessTokens.sign(userId),
      accessTokenExpiresIn: this.accessTokens.ttlSeconds,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }
}
