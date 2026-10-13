import { Inject, Injectable, Logger } from '@nestjs/common';
import { CryptoService } from '../../../shared/application/crypto.service';
import { TransactionManager } from '../../../shared/application/transaction-manager';
import { Clock } from '../../../shared/domain/clock';
import { DomainError } from '../../../shared/domain/domain-error';
import { addDays } from '../../../shared/domain/time';
import { ListsService, ListSnapshot } from '../../lists/application/lists.service';
import { ListAccessService } from '../../lists/application/list-access.service';
import { ListEventPublisher } from '../../lists/application/list-event.publisher';
import { ListChangedEvent } from '../../lists/domain/list-changed.event';
import { ListMember, MANAGER_ROLES, MAX_LIST_MEMBERS } from '../../lists/domain/list-member';
import { ListNotFoundError, MemberLimitReachedError } from '../../lists/domain/lists.errors';
import { MembershipPolicy } from '../../lists/domain/membership.policy';
import { ListMemberRepository, ListRepository } from '../../lists/domain/repositories';
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_TOKEN_BYTES,
  InviteCredential,
} from '../domain/invite-credential';
import { InviteRepository } from '../domain/invite.repository';
import { InviteCodeCollisionError } from '../domain/invites.errors';
import { ListInvite } from '../domain/list-invite';
import { InviteFinder } from './invite-finder';

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

export interface RevokeInviteCommand {
  listId: string;
  userId: string;
}

export interface InviteValidationResult {
  valid: boolean;
  errorCode?: string;
  message?: string;
  listName?: string;
  memberCount?: number;
  maxMembers: number;
  expiresAt?: string;
}

export interface JoinListCommand {
  credential: string;
  userId: string;
  displayName?: string;
  email?: string | null;
}

export interface JoinListResult extends ListSnapshot {
  alreadyMember: boolean;
}

const MAX_CODE_ATTEMPTS = 3;

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly transactions: TransactionManager,
    private readonly invites: InviteRepository,
    private readonly finder: InviteFinder,
    private readonly lists: ListRepository,
    private readonly members: ListMemberRepository,
    private readonly access: ListAccessService,
    private readonly listsService: ListsService,
    private readonly events: ListEventPublisher,
    private readonly crypto: CryptoService,
    private readonly clock: Clock,
    @Inject(INVITE_SETTINGS) private readonly settings: InviteSettings,
  ) {}

  async create(command: CreateInviteCommand): Promise<CreateInviteResult> {
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

  async revoke(command: RevokeInviteCommand): Promise<void> {
    await this.transactions.run(
      async () => {
        await this.access.requireMember(command.listId, command.userId, MANAGER_ROLES);
        await this.invites.deactivateActive(command.listId);
      },
      { lockKey: command.listId },
    );
  }

  async validate(rawCredential: string): Promise<InviteValidationResult> {
    try {
      const credential = InviteCredential.parse(rawCredential);
      const invite = await this.finder.find(credential);
      invite.assertUsableAt(this.clock.now());
      const list = await this.lists.findById(invite.listId);
      if (!list || list.isDeleted) {
        throw new ListNotFoundError();
      }
      const memberCount = await this.members.countByList(list.id);
      const summary = { listName: list.name, memberCount, maxMembers: MAX_LIST_MEMBERS };
      if (memberCount >= MAX_LIST_MEMBERS) {
        const limit = new MemberLimitReachedError();
        return { valid: false, errorCode: limit.code, message: limit.message, ...summary };
      }
      return { valid: true, ...summary, expiresAt: invite.expiresAt.toISOString() };
    } catch (error) {
      if (error instanceof DomainError) {
        this.logger.debug(`Invite validation failed: ${error.code}`);
        return { valid: false, errorCode: error.code, message: error.message, maxMembers: MAX_LIST_MEMBERS };
      }
      throw error;
    }
  }

  async join(command: JoinListCommand): Promise<JoinListResult> {
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

    const snapshot = await this.listsService.getSnapshot({ listId: outcome.listId, userId: command.userId });
    return { alreadyMember: outcome.alreadyMember, ...snapshot };
  }
}
