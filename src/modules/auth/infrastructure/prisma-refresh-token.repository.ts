import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../shared/infrastructure/prisma/prisma-transaction.context';
import { RefreshToken } from '../domain/refresh-token';
import { RefreshTokenRepository } from '../domain/repositories';

@Injectable()
export class PrismaRefreshTokenRepository extends RefreshTokenRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async create(token: RefreshToken): Promise<void> {
    await this.db.client.refreshToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
      },
    });
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const row = await this.db.client.refreshToken.findUnique({ where: { tokenHash } });
    return row ? new RefreshToken(row.id, row.userId, row.tokenHash, row.expiresAt, row.revokedAt) : null;
  }

  async revoke(id: string, at: Date): Promise<void> {
    await this.db.client.refreshToken.update({ where: { id }, data: { revokedAt: at } });
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await this.db.client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
  }
}
