import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../shared/application/transaction-manager';
import { Clock } from '../../../shared/domain/clock';
import {
  GetListSnapshotUseCase,
  ListSnapshot,
} from '../../lists/application/get-list-snapshot.use-case';
import { ListAccessService } from '../../lists/application/list-access.service';
import { ListEventPublisher } from '../../lists/application/list-event.publisher';
import { ListChangedEvent } from '../../lists/domain/list-changed.event';
import { ListMember } from '../../lists/domain/list-member';
import { MembershipPolicy } from '../../lists/domain/membership.policy';
import { ListMemberRepository } from '../../lists/domain/repositories';
import { InviteCredential } from '../domain/invite-credential';
import { InviteFinder } from './invite-finder';

export interface JoinListCommand {
  credential: string;
  userId: string;
  displayName?: string;
  email?: string | null;
}

export interface JoinListResult extends ListSnapshot {
  alreadyMember: boolean;
}

@Injectable()
export class JoinListUseCase {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly finder: InviteFinder,
    private readonly members: ListMemberRepository,
    private readonly access: ListAccessService,
    private readonly snapshots: GetListSnapshotUseCase,
    private readonly events: ListEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: JoinListCommand): Promise<JoinListResult> {
    const credential = InviteCredential.parse(command.credential);
    const located = await this.finder.find(credential);

    const outcome = await this.transactions.run(
      async () => {
        const invite = await this.finder.find(credential);
        const existing = await this.members.find(invite.listId, command.userId);
        if (existing) {
          return { listId: invite.listId, alreadyMember: true, member: existing };
        }
        const now = this.clock.now();
        invite.assertUsableAt(now);
        await this.access.requireActiveList(invite.listId);
        MembershipPolicy.assertHasCapacity(await this.members.countByList(invite.listId));
        const member = ListMember.collaborator(
          invite.listId,
          command.userId,
          command.displayName,
          command.email ?? null,
          now,
        );
        await this.members.add(member);
        return { listId: invite.listId, alreadyMember: false, member };
      },
      { lockKey: located.listId },
    );

    if (!outcome.alreadyMember) {
      this.events.publish(
        new ListChangedEvent(outcome.listId, 'member', command.userId, 'upserted', outcome.member.joinedAt, {
          userId: outcome.member.userId,
          role: outcome.member.role,
          displayName: outcome.member.displayName,
        }),
      );
    }
    const snapshot = await this.snapshots.execute({ listId: outcome.listId, userId: command.userId });
    return { alreadyMember: outcome.alreadyMember, ...snapshot };
  }
}
