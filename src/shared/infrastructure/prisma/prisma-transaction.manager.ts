import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { TransactionManager, TransactionOptions } from '../../application/transaction-manager';
import { PrismaService } from './prisma.service';
import { PrismaTransactionContext } from './prisma-transaction.context';

@Injectable()
export class PrismaTransactionManager extends TransactionManager {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: PrismaTransactionContext,
  ) {
    super();
  }

  async run<T>(work: () => Promise<T>, options: TransactionOptions = {}): Promise<T> {
    const openTransaction = this.context.current();
    if (openTransaction) {
      await this.lock(openTransaction, options.lockKey);
      return work();
    }
    return this.prisma.$transaction((transaction) =>
      this.context.runWith(transaction, async () => {
        await this.lock(transaction, options.lockKey);
        return work();
      }),
    );
  }

  private async lock(transaction: Prisma.TransactionClient, lockKey?: string): Promise<void> {
    if (lockKey) {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
    }
  }
}
