import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../shared/application/transaction-manager';
import { Clock } from '../../../shared/domain/clock';
import { earliest } from '../../../shared/domain/time';
import { ListChangedEvent } from '../domain/list-changed.event';
import { ItemNotFoundError } from '../domain/lists.errors';
import { ListItemRepository } from '../domain/repositories';
import { ListAccessService } from './list-access.service';
import { ListEventPublisher } from './list-event.publisher';

export interface DeleteItemCommand {
  listId: string;
  itemId: string;
  userId: string;
  clientDeletedAt?: Date;
}

export interface DeleteItemResult {
  applied: boolean;
}

@Injectable()
export class DeleteItemUseCase {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly items: ListItemRepository,
    private readonly access: ListAccessService,
    private readonly events: ListEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: DeleteItemCommand): Promise<DeleteItemResult> {
    const deletedAt = command.clientDeletedAt
      ? earliest(command.clientDeletedAt, this.clock.now())
      : this.clock.now();

    const outcome = await this.transactions.run(
      async () => {
        await this.access.requireMember(command.listId, command.userId);
        const existing = await this.items.findById(command.itemId);
        if (!existing || existing.listId !== command.listId) {
          throw new ItemNotFoundError();
        }
        if (!existing.acceptsChangeAt(deletedAt)) {
          return { applied: false };
        }
        const updated = existing.markDeleted(deletedAt);
        await this.items.save(updated);
        return { applied: true };
      },
      { lockKey: command.listId },
    );

    if (outcome.applied) {
      this.events.publish(
        new ListChangedEvent(command.listId, 'item', command.itemId, 'deleted', deletedAt),
      );
    }
    return outcome;
  }
}
