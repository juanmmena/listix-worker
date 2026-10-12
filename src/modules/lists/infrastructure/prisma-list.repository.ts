import { Injectable } from '@nestjs/common';
import { List as ListRow } from '../../../generated/prisma/client';
import { PrismaTransactionContext } from '../../../shared/infrastructure/prisma/prisma-transaction.context';
import { ListRepository } from '../domain/repositories';
import { ShoppingList } from '../domain/shopping-list';

export const ListMapper = {
  toDomain(row: ListRow): ShoppingList {
    return ShoppingList.restore({
      id: row.id,
      name: row.name,
      createdBy: row.createdBy,
      isStarred: row.isStarred,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  },

  toPersistence(list: ShoppingList): ListRow {
    return { ...list.toPrimitives() };
  },
};

@Injectable()
export class PrismaListRepository extends ListRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findById(id: string): Promise<ShoppingList | null> {
    const row = await this.db.client.list.findUnique({ where: { id } });
    return row ? ListMapper.toDomain(row) : null;
  }

  async findActiveForMember(userId: string): Promise<ShoppingList[]> {
    const rows = await this.db.client.list.findMany({
      where: { deletedAt: null, members: { some: { userId } } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(ListMapper.toDomain);
  }

  async save(list: ShoppingList): Promise<void> {
    const data = ListMapper.toPersistence(list);
    await this.db.client.list.upsert({ where: { id: data.id }, create: data, update: data });
  }
}
