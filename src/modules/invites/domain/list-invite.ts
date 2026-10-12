import { InviteExpiredError, InviteRevokedError } from './invites.errors';

export interface ListInviteProps {
  id: string;
  listId: string;
  tokenHash: string;
  inviteCode: string | null;
  createdBy: string | null;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}

export class ListInvite {
  private constructor(private readonly props: ListInviteProps) {}

  static issue(props: Omit<ListInviteProps, 'isActive'>): ListInvite {
    return new ListInvite({ ...props, isActive: true });
  }

  static restore(props: ListInviteProps): ListInvite {
    return new ListInvite({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get listId(): string {
    return this.props.listId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get inviteCode(): string | null {
    return this.props.inviteCode;
  }

  get createdBy(): string | null {
    return this.props.createdBy;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  assertUsableAt(now: Date): void {
    if (!this.props.isActive) {
      throw new InviteRevokedError();
    }
    if (this.props.expiresAt.getTime() <= now.getTime()) {
      throw new InviteExpiredError();
    }
  }

  toPrimitives(): Readonly<ListInviteProps> {
    return { ...this.props };
  }
}
