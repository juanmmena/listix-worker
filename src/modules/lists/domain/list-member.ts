export const MAX_LIST_MEMBERS = 5;
export const MEMBER_ROLES = ['owner', 'admin', 'member'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];
export const MANAGER_ROLES: readonly MemberRole[] = ['owner', 'admin'];
export const ASSIGNABLE_ROLES: readonly MemberRole[] = ['admin', 'member'];

export class ListMember {
  constructor(
    readonly listId: string,
    readonly userId: string,
    readonly role: MemberRole,
    readonly displayName: string,
    readonly email: string | null,
    readonly joinedAt: Date,
  ) {}

  static owner(listId: string, userId: string, at: Date): ListMember {
    return new ListMember(listId, userId, 'owner', 'Owner', null, at);
  }

  static collaborator(
    listId: string,
    userId: string,
    displayName: string | undefined,
    email: string | null,
    at: Date,
  ): ListMember {
    return new ListMember(listId, userId, 'member', displayName?.trim() || 'Collaborator', email, at);
  }

  isOwner(): boolean {
    return this.role === 'owner';
  }

  canManage(): boolean {
    return MANAGER_ROLES.includes(this.role);
  }

  withRole(role: MemberRole): ListMember {
    return new ListMember(this.listId, this.userId, role, this.displayName, this.email, this.joinedAt);
  }
}
