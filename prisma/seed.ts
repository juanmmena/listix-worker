import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

async function seed(): Promise<void> {
  const owner = await prisma.user.create({ data: { displayName: 'Demo owner' } });
  const listId = randomUUID();
  await prisma.list.create({ data: { id: listId, name: 'Groceries', createdBy: owner.id } });
  await prisma.listMember.create({
    data: { listId, userId: owner.id, role: 'owner', displayName: 'Demo owner' },
  });
  await prisma.listItem.create({ data: { id: randomUUID(), listId, title: 'Milk' } });
}

seed().finally(() => prisma.$disconnect());
