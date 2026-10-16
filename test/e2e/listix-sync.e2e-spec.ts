import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { TestDbHelper } from './test-db.helper';

describe('Listix Sync, Collaboration & Concurrent Join (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await TestDbHelper.setup();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await TestDbHelper.teardown();
  });

  beforeEach(async () => {
    await TestDbHelper.clean();
  });

  const createAnonymousUser = async (): Promise<{
    userId: string;
    accessToken: string;
  }> => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/anonymous')
      .expect(201);

    return {
      userId: response.body.userId,
      accessToken: response.body.accessToken,
    };
  };

  describe('List Lifecycle & LWW Synchronization', () => {
    it('creates a list and applies Last-Write-Wins rules on updates', async () => {
      const { accessToken } = await createAnonymousUser();
      const listId = randomUUID();
      const t1 = new Date('2026-10-10T12:00:00.000Z');
      const t0Stale = new Date('2026-10-10T11:00:00.000Z');
      const t2Newer = new Date('2026-10-10T13:00:00.000Z');

      const createRes = await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Weekend Groceries',
          updatedAt: t1.toISOString(),
        })
        .expect(200);

      expect(createRes.body).toMatchObject({
        applied: true,
        created: true,
        list: {
          id: listId,
          name: 'Weekend Groceries',
        },
      });

      const staleRes = await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Stale Name Overwrite',
          updatedAt: t0Stale.toISOString(),
        })
        .expect(200);

      expect(staleRes.body.applied).toBe(false);
      expect(staleRes.body.list.name).toBe('Weekend Groceries');

      const newerRes = await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Groceries',
          updatedAt: t2Newer.toISOString(),
        })
        .expect(200);

      expect(newerRes.body.applied).toBe(true);
      expect(newerRes.body.list.name).toBe('Updated Groceries');

      const snapshot = await request(app.getHttpServer())
        .get(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(snapshot.body.list.name).toBe('Updated Groceries');
      expect(snapshot.body.members).toHaveLength(1);
    });
  });

  describe('Item Upsert, LWW & Resurrection Lifecycle', () => {
    it('supports upserting, stale rejection, soft-deletion, and resurrecting items', async () => {
      const { accessToken } = await createAnonymousUser();
      const listId = randomUUID();
      const itemId = randomUUID();

      await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Todo List',
          updatedAt: new Date('2026-10-10T10:00:00.000Z').toISOString(),
        })
        .expect(200);

      const t1 = new Date('2026-10-10T10:05:00.000Z');
      const createItemRes = await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}/items/${itemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Buy Milk',
          isCompleted: false,
          position: 0,
          updatedAt: t1.toISOString(),
        })
        .expect(200);

      expect(createItemRes.body).toMatchObject({
        applied: true,
        item: {
          id: itemId,
          title: 'Buy Milk',
          isCompleted: false,
          position: 0,
        },
      });

      const tStale = new Date('2026-10-10T10:01:00.000Z');
      const staleItemRes = await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}/items/${itemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Stale Milk Title',
          isCompleted: true,
          position: 1,
          updatedAt: tStale.toISOString(),
        })
        .expect(200);

      expect(staleItemRes.body.applied).toBe(false);
      expect(staleItemRes.body.item.title).toBe('Buy Milk');

      const tDelete = new Date('2026-10-10T10:10:00.000Z');
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/v1/lists/${listId}/items/${itemId}`)
        .query({ deletedAt: tDelete.toISOString() })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(deleteRes.body.applied).toBe(true);

      const snapshotAfterDelete = await request(app.getHttpServer())
        .get(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(snapshotAfterDelete.body.items).toHaveLength(0);

      const tResurrect = new Date('2026-10-10T10:15:00.000Z');
      const resurrectRes = await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}/items/${itemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Buy Almond Milk',
          isCompleted: false,
          position: 0,
          updatedAt: tResurrect.toISOString(),
        })
        .expect(200);

      expect(resurrectRes.body.applied).toBe(true);
      expect(resurrectRes.body.item.title).toBe('Buy Almond Milk');

      const snapshotAfterResurrect = await request(app.getHttpServer())
        .get(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(snapshotAfterResurrect.body.items).toHaveLength(1);
      expect(snapshotAfterResurrect.body.items[0]).toMatchObject({
        id: itemId,
        title: 'Buy Almond Milk',
      });
    });
  });

  describe('Collaboration & Invite Flow', () => {
    it('creates invite, validates credential, joins list, and handles idempotency and revocation', async () => {
      const owner = await createAnonymousUser();
      const listId = randomUUID();

      await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          name: 'Shared Shopping',
          updatedAt: new Date().toISOString(),
        })
        .expect(200);

      const inviteRes = await request(app.getHttpServer())
        .post(`/api/v1/lists/${listId}/invites`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(201);

      const { inviteCode } = inviteRes.body;
      expect(inviteCode).toBeDefined();

      const validateRes = await request(app.getHttpServer())
        .get(`/api/v1/invites/${inviteCode}`)
        .expect(200);

      expect(validateRes.body).toMatchObject({
        valid: true,
        listName: 'Shared Shopping',
        memberCount: 1,
        maxMembers: 5,
      });

      const member = await createAnonymousUser();
      const joinRes = await request(app.getHttpServer())
        .post('/api/v1/invites/join')
        .set('Authorization', `Bearer ${member.accessToken}`)
        .send({
          credential: inviteCode,
          displayName: 'Guest Collaborator',
        })
        .expect(200);

      expect(joinRes.body.alreadyMember).toBe(false);
      expect(joinRes.body.list.id).toBe(listId);
      expect(joinRes.body.members).toHaveLength(2);

      const idempotentJoinRes = await request(app.getHttpServer())
        .post('/api/v1/invites/join')
        .set('Authorization', `Bearer ${member.accessToken}`)
        .send({
          credential: inviteCode,
        })
        .expect(200);

      expect(idempotentJoinRes.body.alreadyMember).toBe(true);

      await request(app.getHttpServer())
        .delete(`/api/v1/lists/${listId}/invites/active`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(204);

      const newMember = await createAnonymousUser();
      const revokedJoinRes = await request(app.getHttpServer())
        .post('/api/v1/invites/join')
        .set('Authorization', `Bearer ${newMember.accessToken}`)
        .send({
          credential: inviteCode,
        })
        .expect(410);

      expect(revokedJoinRes.body).toMatchObject({
        statusCode: 410,
        errorCode: 'INVITE_REVOKED',
      });
    });
  });

  describe('Concurrent Join & Member Limit (Rule M-2)', () => {
    it('admits exactly 5 total members when 6 people attempt to join concurrently', async () => {
      const owner = await createAnonymousUser();
      const listId = randomUUID();

      await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          name: 'Party Supplies',
          updatedAt: new Date().toISOString(),
        })
        .expect(200);

      const inviteRes = await request(app.getHttpServer())
        .post(`/api/v1/lists/${listId}/invites`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(201);

      const { inviteCode } = inviteRes.body;

      // 1 owner already exists. If 6 users attempt to join concurrently,
      // 4 must succeed (reaching 5 members max) and 2 must receive 409 Conflict.
      const joiners = await Promise.all(
        Array.from({ length: 6 }, () => createAnonymousUser()),
      );

      const joinResponses = await Promise.all(
        joiners.map((joiner) =>
          request(app.getHttpServer())
            .post('/api/v1/invites/join')
            .set('Authorization', `Bearer ${joiner.accessToken}`)
            .send({ credential: inviteCode }),
        ),
      );

      const successfulJoins = joinResponses.filter((res) => res.status === 200);
      const rejectedJoins = joinResponses.filter((res) => res.status === 409);

      expect(successfulJoins).toHaveLength(4);
      expect(rejectedJoins).toHaveLength(2);

      for (const res of rejectedJoins) {
        expect(res.body).toMatchObject({
          statusCode: 409,
          errorCode: 'MEMBER_LIMIT_REACHED',
        });
      }

      const snapshot = await request(app.getHttpServer())
        .get(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(snapshot.body.members).toHaveLength(5);
    });
  });
});
