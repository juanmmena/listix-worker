import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../shared/application/transaction-manager';
import { Clock } from '../../../shared/domain/clock';
import { earliest } from '../../../shared/domain/time';
import { ListChangedEvent } from '../domain/list-changed.event';
import { ListItem } from '../domain/list-item';
import { ItemNotFoundError } from '../domain/lists.errors';
import { ListItemRepository } from '../domain/repositories';
import { ListAccessService } from './list-access.service';
import { ListEventPublisher } from './list-event.publisher';

export interface UpsertItemCommand {
  listId: string;
  itemId: string;
  userId: string;
  title: string;
  isCompleted: boolean;
  position: number;
  clientUpdatedAt: Date;
}

@Injectable()
export class UpsertItemUseCase {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly items: ListItemRepository,
    private readonly access: ListAccessService,
    private readonly events: ListEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: UpsertItemCommand): Promise<{ item: ListItem; applied: boolean }> {
    const changeAt = earliest(command.clientUpdatedAt, this.clock.now());
    const changes = { title: command.title, isCompleted: command.isCompleted, position: command.position };

    const outcome = await this.transactions.run(
      async () => {
        await this.access.requireMember(command.listId, command.userId);
        const existing = await this.items.findById(command.itemId);
        if (existing && existing.listId !== command.listId) {
          throw new ItemNotFoundError();
        }
        if (existing && !existing.acceptsChangeAt(changeAt)) {
          return { item: existing, applied: false };
        }
        const item = existing
          ? existing.applyChanges(changes, changeAt)
          : ListItem.create(command.itemId, command.listId, changes, changeAt);
        await this.items.save(item);
        return { item, applied: true };
      },
      { lockKey: command.listId },
    );

    if (outcome.applied) {
      this.events.publish(
        new ListChangedEvent(command.listId, 'item', command.itemId, 'upserted', changeAt, {
          ...outcome.item.toPrimitives(),
        }),
      );
    }
    return outcome;
  }
}
