import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaTransactionContext {
  private readonly storage = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  get client(): Prisma.TransactionClient {
    return this.storage.getStore() ?? this.prisma;
  }

  current(): Prisma.TransactionClient | undefined {
    return this.storage.getStore();
  }

  runWith<T>(transaction: Prisma.TransactionClient, work: () => Promise<T>): Promise<T> {
    return this.storage.run(transaction, work);
  }
}
