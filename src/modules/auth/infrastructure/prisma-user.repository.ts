import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../shared/infrastructure/prisma/prisma-transaction.context';
import { UserRepository } from '../domain/repositories';
import { User } from '../domain/user';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async save(user: User): Promise<void> {
    await this.db.client.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        displayName: user.displayName,
        createdAt: user.createdAt,
        lastSeenAt: user.lastSeenAt,
      },
      update: {
        displayName: user.displayName,
        lastSeenAt: user.lastSeenAt,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.client.user.findUnique({ where: { id } });
    return row ? new User(row.id, row.displayName, row.createdAt, row.lastSeenAt) : null;
  }

  async touch(id: string, at: Date): Promise<void> {
    await this.db.client.user.update({
      where: { id },
      data: { lastSeenAt: at },
    });
  }
}
