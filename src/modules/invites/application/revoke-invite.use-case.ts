import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../shared/application/transaction-manager';
import { ListAccessService } from '../../lists/application/list-access.service';
import { MANAGER_ROLES } from '../../lists/domain/list-member';
import { InviteRepository } from '../domain/invite.repository';

export interface RevokeInviteCommand {
  listId: string;
  userId: string;
}

@Injectable()
export class RevokeInviteUseCase {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly invites: InviteRepository,
    private readonly access: ListAccessService,
  ) {}

  async execute(command: RevokeInviteCommand): Promise<void> {
    await this.transactions.run(
      async () => {
        await this.access.requireMember(command.listId, command.userId, MANAGER_ROLES);
        await this.invites.deactivateActive(command.listId);
      },
      { lockKey: command.listId },
    );
  }
}
