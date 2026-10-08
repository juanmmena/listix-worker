import { Injectable } from '@nestjs/common';
import { CryptoService } from '../../../shared/application/crypto.service';
import { TransactionManager } from '../../../shared/application/transaction-manager';
import { Clock } from '../../../shared/domain/clock';
import { InvalidRefreshTokenError } from '../domain/auth.errors';
import { RefreshTokenRepository, UserRepository } from '../domain/repositories';
import { SessionIssuer, SessionTokens } from './session-issuer';

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly users: UserRepository,
    private readonly sessions: SessionIssuer,
    private readonly transactions: TransactionManager,
    private readonly crypto: CryptoService,
    private readonly clock: Clock,
  ) {}

  async execute(rawRefreshToken: string): Promise<SessionTokens> {
    const now = this.clock.now();
    const stored = await this.refreshTokens.findByHash(this.crypto.sha256Hex(rawRefreshToken));
    if (!stored) {
      throw new InvalidRefreshTokenError();
    }
    if (stored.isRevoked()) {
      await this.refreshTokens.revokeAllForUser(stored.userId, now);
      throw new InvalidRefreshTokenError();
    }
    if (stored.isExpiredAt(now)) {
      throw new InvalidRefreshTokenError();
    }
    return this.transactions.run(async () => {
      await this.refreshTokens.revoke(stored.id, now);
      await this.users.touch(stored.userId, now);
      return this.sessions.issue(stored.userId);
    });
  }
}
