import { Injectable } from '@nestjs/common';
import { ListMember, MEMBER_ROLES, MemberRole } from '../domain/list-member';
import {
  ListAccessDeniedError,
  ListNotFoundError,
  PermissionDeniedError,
} from '../domain/lists.errors';
import { ListMemberRepository, ListRepository } from '../domain/repositories';
import { ShoppingList } from '../domain/shopping-list';

@Injectable()
export class ListAccessService {
  constructor(
    private readonly lists: ListRepository,
    private readonly members: ListMemberRepository,
  ) {}

  async requireActiveList(listId: string): Promise<ShoppingList> {
    const list = await this.lists.findById(listId);
    if (!list || list.isDeleted) {
      throw new ListNotFoundError();
    }
    return list;
  }

  async requireMember(
    listId: string,
    userId: string,
    allowedRoles: readonly MemberRole[] = MEMBER_ROLES,
  ): Promise<ListMember> {
    await this.requireActiveList(listId);
    const member = await this.members.find(listId, userId);
    if (!member) {
      throw new ListAccessDeniedError();
    }
    if (!allowedRoles.includes(member.role)) {
      throw new PermissionDeniedError();
    }
    return member;
  }
}
