import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../shared/application/transaction-manager';
import { Clock } from '../../../shared/domain/clock';
import { earliest } from '../../../shared/domain/time';
import { ListChangedEvent } from '../domain/list-changed.event';
import { ListItem } from '../domain/list-item';
import { ListMember, MANAGER_ROLES } from '../domain/list-member';
import {
  ListItemRepository,
  ListMemberRepository,
  ListRepository,
} from '../domain/repositories';
import { ShoppingList } from '../domain/shopping-list';
import { ListAccessService } from './list-access.service';
import { ListEventPublisher } from './list-event.publisher';

export interface SyncListCommand {
  listId: string;
  userId: string;
  name: string;
  isStarred?: boolean;
  position?: number;
  clientUpdatedAt: Date;
}

export interface SyncListResult {
  list: ShoppingList;
  applied: boolean;
  created: boolean;
}

export interface GetListSnapshotCommand {
  listId: string;
  userId: string;
}

export interface ListSnapshot {
  list: ShoppingList;
  items: ListItem[];
  members: ListMember[];
  serverTime: Date;
}

export interface DeleteListCommand {
  listId: string;
  userId: string;
}

@Injectable()
export class ListsService {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly lists: ListRepository,
    private readonly members: ListMemberRepository,
    private readonly items: ListItemRepository,
    private readonly access: ListAccessService,
    private readonly events: ListEventPublisher,
    private readonly clock: Clock,
  ) {}

  async findMine(userId: string): Promise<ShoppingList[]> {
    return this.lists.findActiveForMember(userId);
  }

  async sync(command: SyncListCommand): Promise<SyncListResult> {
    const changeAt = earliest(command.clientUpdatedAt, this.clock.now());
    const changes = { name: command.name, isStarred: command.isStarred, position: command.position };

    const result = await this.transactions.run(
      async (): Promise<SyncListResult> => {
        const existing = await this.lists.findById(command.listId);
        if (!existing) {
          const list = ShoppingList.create(command.listId, command.userId, changes, changeAt);
          await this.lists.save(list);
          await this.members.add(ListMember.owner(list.id, command.userId, changeAt));
          return { list, applied: true, created: true };
        }

        await this.access.requireMember(command.listId, command.userId);
        if (!existing.acceptsChangeAt(changeAt)) {
          return { list: existing, applied: false, created: false };
        }

        const updated = existing.applyChanges(changes, changeAt);
        await this.lists.save(updated);
        return { list: updated, applied: true, created: false };
      },
      { lockKey: command.listId },
    );

    if (result.applied) {
      this.events.publish(
        new ListChangedEvent(command.listId, 'list', command.listId, 'upserted', changeAt, {
          ...result.list.toPrimitives(),
        }),
      );
    }

    return result;
  }

  async getSnapshot(command: GetListSnapshotCommand): Promise<ListSnapshot> {
    await this.access.requireMember(command.listId, command.userId);
    const list = await this.access.requireActiveList(command.listId);
    const [items, members] = await Promise.all([
      this.items.findActiveByList(command.listId),
      this.members.findByList(command.listId),
    ]);
    return {
      list,
      items,
      members,
      serverTime: this.clock.now(),
    };
  }

  async delete(command: DeleteListCommand): Promise<void> {
    const now = this.clock.now();
    await this.transactions.run(
      async () => {
        const list = await this.access.requireActiveList(command.listId);
        await this.access.requireMember(command.listId, command.userId, MANAGER_ROLES);
        const deleted = list.markDeleted(now);
        await this.lists.save(deleted);
      },
      { lockKey: command.listId },
    );

    this.events.publish(
      new ListChangedEvent(command.listId, 'list', command.listId, 'deleted', now),
    );
  }
}
