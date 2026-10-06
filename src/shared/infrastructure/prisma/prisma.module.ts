import { Global, Module } from '@nestjs/common';
import { TransactionManager } from '../../application/transaction-manager';
import { PrismaService } from './prisma.service';
import { PrismaTransactionContext } from './prisma-transaction.context';
import { PrismaTransactionManager } from './prisma-transaction.manager';

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaTransactionContext,
    { provide: TransactionManager, useClass: PrismaTransactionManager },
  ],
  exports: [PrismaService, PrismaTransactionContext, TransactionManager],
})
export class PrismaModule {}
