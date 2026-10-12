import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../shared/application/transaction-manager';
import { Clock } from '../../../shared/domain/clock';
import { ListChangedEvent } from '../domain/list-changed.event';
import { MANAGER_ROLES } from '../domain/list-member';
import { ListRepository } from '../domain/repositories';
import { ListAccessService } from './list-access.service';
import { ListEventPublisher } from './list-event.publisher';

export interface DeleteListCommand {
  listId: string;
  userId: string;
}

@Injectable()
export class DeleteListUseCase {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly lists: ListRepository,
    private readonly access: ListAccessService,
    private readonly events: ListEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: DeleteListCommand): Promise<void> {
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
