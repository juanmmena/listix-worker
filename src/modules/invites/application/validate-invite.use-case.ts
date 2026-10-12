import { Injectable, Logger } from '@nestjs/common';
import { Clock } from '../../../shared/domain/clock';
import { DomainError } from '../../../shared/domain/domain-error';
import { MAX_LIST_MEMBERS } from '../../lists/domain/list-member';
import { ListNotFoundError, MemberLimitReachedError } from '../../lists/domain/lists.errors';
import { ListMemberRepository, ListRepository } from '../../lists/domain/repositories';
import { InviteCredential } from '../domain/invite-credential';
import { InviteFinder } from './invite-finder';

export interface InviteValidationResult {
  valid: boolean;
  errorCode?: string;
  message?: string;
  listName?: string;
  memberCount?: number;
  maxMembers: number;
  expiresAt?: string;
}

@Injectable()
export class ValidateInviteUseCase {
  private readonly logger = new Logger(ValidateInviteUseCase.name);

  constructor(
    private readonly finder: InviteFinder,
    private readonly lists: ListRepository,
    private readonly members: ListMemberRepository,
    private readonly clock: Clock,
  ) {}

  async execute(rawCredential: string): Promise<InviteValidationResult> {
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
}
