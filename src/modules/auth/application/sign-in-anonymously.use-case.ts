import { Injectable } from '@nestjs/common';
import { CryptoService } from '../../../shared/application/crypto.service';
import { TransactionManager } from '../../../shared/application/transaction-manager';
import { Clock } from '../../../shared/domain/clock';
import { UserRepository } from '../domain/repositories';
import { User } from '../domain/user';
import { SessionIssuer, SessionTokens } from './session-issuer';

@Injectable()
export class SignInAnonymouslyUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionIssuer,
    private readonly transactions: TransactionManager,
    private readonly crypto: CryptoService,
    private readonly clock: Clock,
  ) {}

  execute(): Promise<SessionTokens> {
    return this.transactions.run(async () => {
      const user = User.anonymous(this.crypto.uuid(), this.clock.now());
      await this.users.save(user);
      return this.sessions.issue(user.id);
    });
  }
}
