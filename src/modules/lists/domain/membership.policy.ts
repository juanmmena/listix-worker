import { ASSIGNABLE_ROLES, ListMember, MAX_LIST_MEMBERS, MemberRole } from './list-member';
import {
  InvalidRoleChangeError,
  MemberLimitReachedError,
  OwnerCannotLeaveError,
  PermissionDeniedError,
} from './lists.errors';

export const MembershipPolicy = {
  assertHasCapacity(currentMemberCount: number): void {
    if (currentMemberCount >= MAX_LIST_MEMBERS) {
      throw new MemberLimitReachedError();
    }
  },

  assertCanRemove(actor: ListMember, target: ListMember): void {
    if (target.isOwner()) {
      throw new OwnerCannotLeaveError();
    }
    if (actor.userId !== target.userId && !actor.canManage()) {
      throw new PermissionDeniedError();
    }
  },

  assertCanChangeRole(actor: ListMember, target: ListMember, role: MemberRole): void {
    if (!actor.canManage()) {
      throw new PermissionDeniedError();
    }
    if (target.isOwner() || !ASSIGNABLE_ROLES.includes(role)) {
      throw new InvalidRoleChangeError();
    }
  },
};
