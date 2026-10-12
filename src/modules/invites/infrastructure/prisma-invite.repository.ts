import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaTransactionContext } from '../../../shared/infrastructure/prisma/prisma-transaction.context';
import { InviteRepository } from '../domain/invite.repository';
import { InviteCodeCollisionError } from '../domain/invites.errors';
import { ListInvite, ListInviteProps } from '../domain/list-invite';

type ListInviteRow = ListInviteProps;

@Injectable()
export class PrismaInviteRepository extends InviteRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findLatestByTokenHash(tokenHash: string): Promise<ListInvite | null> {
    const row = await this.db.client.listInvite.findUnique({ where: { tokenHash } });
    return row ? ListInvite.restore(row) : null;
  }

  async findLatestByCode(code: string): Promise<ListInvite | null> {
    const [row] = await this.db.client.$queryRaw<ListInviteRow[]>`
      SELECT id, list_id AS "listId", token_hash AS "tokenHash", invite_code AS "inviteCode",
             created_by AS "createdBy", expires_at AS "expiresAt", is_active AS "isActive",
             created_at AS "createdAt"
      FROM list_invites
      WHERE upper(invite_code) = ${code}
      ORDER BY created_at DESC
      LIMIT 1`;
    return row ? ListInvite.restore(row) : null;
  }

  async deactivateActive(listId: string): Promise<void> {
    await this.db.client.listInvite.updateMany({
      where: { listId, isActive: true },
      data: { isActive: false },
    });
  }

  async create(invite: ListInvite): Promise<void> {
    try {
      await this.db.client.listInvite.create({ data: { ...invite.toPrimitives() } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new InviteCodeCollisionError();
      }
      throw error;
    }
  }
}
