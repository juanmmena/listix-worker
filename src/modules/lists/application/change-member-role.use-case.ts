import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../shared/application/transaction-manager';
import { Clock } from '../../../shared/domain/clock';
import { ListChangedEvent } from '../domain/list-changed.event';
import { ListMember, MemberRole } from '../domain/list-member';
import { MemberNotFoundError } from '../domain/lists.errors';
import { MembershipPolicy } from '../domain/membership.policy';
import { ListMemberRepository } from '../domain/repositories';
import { ListAccessService } from './list-access.service';
import { ListEventPublisher } from './list-event.publisher';

export interface ChangeMemberRoleCommand {
  listId: string;
  actorUserId: string;
  targetUserId: string;
  role: MemberRole;
}

@Injectable()
export class ChangeMemberRoleUseCase {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly members: ListMemberRepository,
    private readonly access: ListAccessService,
    private readonly events: ListEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: ChangeMemberRoleCommand): Promise<ListMember> {
    const updatedMember = await this.transactions.run(
      async () => {
        const actor = await this.access.requireMember(command.listId, command.actorUserId);
        const target = await this.members.find(command.listId, command.targetUserId);
        if (!target) {
          throw new MemberNotFoundError();
        }
        MembershipPolicy.assertCanChangeRole(actor, target, command.role);
        const updated = target.withRole(command.role);
        await this.members.update(updated);
        return updated;
      },
      { lockKey: command.listId },
    );

    this.events.publish(
      new ListChangedEvent(command.listId, 'member', command.targetUserId, 'upserted', this.clock.now(), {
        role: updatedMember.role,
      }),
    );
    return updatedMember;
  }
}
