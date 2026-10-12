import { ListInvite } from './list-invite';

export abstract class InviteRepository {
  abstract findLatestByTokenHash(tokenHash: string): Promise<ListInvite | null>;
  abstract findLatestByCode(code: string): Promise<ListInvite | null>;
  abstract deactivateActive(listId: string): Promise<void>;
  abstract create(invite: ListInvite): Promise<void>;
}
