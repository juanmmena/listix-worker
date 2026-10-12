import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../shared/infrastructure/prisma/prisma-transaction.context';
import { ListMember, MemberRole } from '../domain/list-member';
import { ListMemberRepository } from '../domain/repositories';

@Injectable()
export class PrismaListMemberRepository extends ListMemberRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async find(listId: string, userId: string): Promise<ListMember | null> {
    const row = await this.db.client.listMember.findUnique({
      where: { listId_userId: { listId, userId } },
    });
    return row
      ? new ListMember(
          row.listId,
          row.userId,
          row.role as MemberRole,
          row.displayName,
          row.email,
          row.createdAt,
        )
      : null;
  }

  async findByList(listId: string): Promise<ListMember[]> {
    const rows = await this.db.client.listMember.findMany({
      where: { listId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(
      (row) =>
        new ListMember(
          row.listId,
          row.userId,
          row.role as MemberRole,
          row.displayName,
          row.email,
          row.createdAt,
        ),
    );
  }

  async countByList(listId: string): Promise<number> {
    return this.db.client.listMember.count({ where: { listId } });
  }

  async add(member: ListMember): Promise<void> {
    await this.db.client.listMember.create({
      data: {
        listId: member.listId,
        userId: member.userId,
        role: member.role,
        displayName: member.displayName,
        email: member.email,
        createdAt: member.joinedAt,
      },
    });
  }

  async update(member: ListMember): Promise<void> {
    await this.db.client.listMember.update({
      where: { listId_userId: { listId: member.listId, userId: member.userId } },
      data: {
        role: member.role,
        displayName: member.displayName,
        email: member.email,
      },
    });
  }

  async remove(listId: string, userId: string): Promise<void> {
    await this.db.client.listMember.deleteMany({
      where: { listId, userId },
    });
  }
}
