import { Inject, Injectable } from '@nestjs/common';
import { CryptoService } from '../../../shared/application/crypto.service';
import { TransactionManager } from '../../../shared/application/transaction-manager';
import { Clock } from '../../../shared/domain/clock';
import { addDays } from '../../../shared/domain/time';
import { ListAccessService } from '../../lists/application/list-access.service';
import { MANAGER_ROLES } from '../../lists/domain/list-member';
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_TOKEN_BYTES,
} from '../domain/invite-credential';
import { InviteRepository } from '../domain/invite.repository';
import { InviteCodeCollisionError } from '../domain/invites.errors';
import { ListInvite } from '../domain/list-invite';

export const INVITE_SETTINGS = Symbol('INVITE_SETTINGS');

export interface InviteSettings {
  ttlDays: number;
  publicBaseUrl: string;
}

export interface CreateInviteCommand {
  listId: string;
  userId: string;
}

export interface CreateInviteResult {
  inviteId: string;
  token: string;
  inviteCode: string;
  inviteUrl: string;
  expiresAt: Date;
}

const MAX_CODE_ATTEMPTS = 3;

@Injectable()
export class CreateInviteUseCase {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly invites: InviteRepository,
    private readonly access: ListAccessService,
    private readonly crypto: CryptoService,
    private readonly clock: Clock,
    @Inject(INVITE_SETTINGS) private readonly settings: InviteSettings,
  ) {}

  async execute(command: CreateInviteCommand): Promise<CreateInviteResult> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.issue(command);
      } catch (error) {
        if (!(error instanceof InviteCodeCollisionError) || attempt >= MAX_CODE_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  private async issue(command: CreateInviteCommand): Promise<CreateInviteResult> {
    const now = this.clock.now();
    const token = this.crypto.randomHex(INVITE_TOKEN_BYTES);
    const inviteCode = this.crypto.randomString(INVITE_CODE_LENGTH, INVITE_CODE_ALPHABET);
    const invite = ListInvite.issue({
      id: this.crypto.uuid(),
      listId: command.listId,
      tokenHash: this.crypto.sha256Hex(token),
      inviteCode,
      createdBy: command.userId,
      expiresAt: addDays(now, this.settings.ttlDays),
      createdAt: now,
    });

    await this.transactions.run(
      async () => {
        await this.access.requireMember(command.listId, command.userId, MANAGER_ROLES);
        await this.invites.deactivateActive(command.listId);
        await this.invites.create(invite);
      },
      { lockKey: command.listId },
    );

    return {
      inviteId: invite.id,
      token,
      inviteCode,
      inviteUrl: `${this.settings.publicBaseUrl}/join/${token}`,
      expiresAt: invite.expiresAt,
    };
  }
}
