import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/domain/clock';
import { ListItem } from '../domain/list-item';
import { ListMember } from '../domain/list-member';
import { ListItemRepository, ListMemberRepository } from '../domain/repositories';
import { ShoppingList } from '../domain/shopping-list';
import { ListAccessService } from './list-access.service';

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

@Injectable()
export class GetListSnapshotUseCase {
  constructor(
    private readonly items: ListItemRepository,
    private readonly members: ListMemberRepository,
    private readonly access: ListAccessService,
    private readonly clock: Clock,
  ) {}

  async execute(command: GetListSnapshotCommand): Promise<ListSnapshot> {
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
}
