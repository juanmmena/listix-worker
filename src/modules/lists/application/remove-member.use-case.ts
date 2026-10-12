import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../shared/application/transaction-manager';
import { Clock } from '../../../shared/domain/clock';
import { ListChangedEvent } from '../domain/list-changed.event';
import { MemberNotFoundError } from '../domain/lists.errors';
import { MembershipPolicy } from '../domain/membership.policy';
import { ListMemberRepository } from '../domain/repositories';
import { ListAccessService } from './list-access.service';
import { ListEventPublisher } from './list-event.publisher';

export interface RemoveMemberCommand {
  listId: string;
  actorUserId: string;
  targetUserId: string;
}

@Injectable()
export class RemoveMemberUseCase {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly members: ListMemberRepository,
    private readonly access: ListAccessService,
    private readonly events: ListEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: RemoveMemberCommand): Promise<void> {
    const now = this.clock.now();
    await this.transactions.run(
      async () => {
        const actor = await this.access.requireMember(command.listId, command.actorUserId);
        const target = await this.members.find(command.listId, command.targetUserId);
        if (!target) {
          throw new MemberNotFoundError();
        }
        MembershipPolicy.assertCanRemove(actor, target);
        await this.members.remove(command.listId, command.targetUserId);
      },
      { lockKey: command.listId },
    );

    this.events.publish(
      new ListChangedEvent(command.listId, 'member', command.targetUserId, 'deleted', now),
    );
  }
}
