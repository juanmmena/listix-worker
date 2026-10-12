import { Injectable } from '@nestjs/common';
import { ListItem as ListItemRow } from '../../../generated/prisma/client';
import { PrismaTransactionContext } from '../../../shared/infrastructure/prisma/prisma-transaction.context';
import { ListItem } from '../domain/list-item';
import { ListItemRepository } from '../domain/repositories';

export const ListItemMapper = {
  toDomain(row: ListItemRow): ListItem {
    return ListItem.restore({
      id: row.id,
      listId: row.listId,
      title: row.title,
      isCompleted: row.isCompleted,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  },

  toPersistence(item: ListItem): ListItemRow {
    return { ...item.toPrimitives() };
  },
};

@Injectable()
export class PrismaListItemRepository extends ListItemRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findById(id: string): Promise<ListItem | null> {
    const row = await this.db.client.listItem.findUnique({ where: { id } });
    return row ? ListItemMapper.toDomain(row) : null;
  }

  async findActiveByList(listId: string): Promise<ListItem[]> {
    const rows = await this.db.client.listItem.findMany({
      where: { listId, deletedAt: null },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(ListItemMapper.toDomain);
  }

  async save(item: ListItem): Promise<void> {
    const data = ListItemMapper.toPersistence(item);
    await this.db.client.listItem.upsert({ where: { id: data.id }, create: data, update: data });
  }
}
