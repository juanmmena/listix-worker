import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import type {
  ListChangedBroadcastPayload,
  RealtimeSubscriptionAck,
} from '../../src/modules/realtime/presentation/realtime.types';
import { TestDbHelper } from './test-db.helper';

describe('Realtime WebSocket Synchronization (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const activeSockets: Socket[] = [];

  beforeAll(async () => {
    await TestDbHelper.setup();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    for (const socket of activeSockets) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
    await app.close();
    await TestDbHelper.teardown();
  });

  beforeEach(async () => {
    await TestDbHelper.clean();
  });

  afterEach(() => {
    while (activeSockets.length > 0) {
      const socket = activeSockets.pop();
      if (socket?.connected) {
        socket.disconnect();
      }
    }
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

  const connectSocket = (token?: string): Promise<Socket> => {
    return new Promise((resolve, reject) => {
      const socket = io(`${baseUrl}/realtime`, {
        auth: token ? { token } : undefined,
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });

      activeSockets.push(socket);

      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', (error) => reject(error));
      socket.on('session.error', () => {
        // May disconnect on session.error, which is tested specifically
      });
    });
  };

  const waitForEvent = <T = unknown>(
    socket: Socket,
    event: string,
    timeoutMs = 5000,
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `Timed out waiting for event "${event}" after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      socket.once(event, (data: T) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  };

  const expectNoEvent = (
    socket: Socket,
    event: string,
    waitMs = 600,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const onEvent = (data: unknown) => {
        reject(
          new Error(
            `Unexpected event "${event}" received: ${JSON.stringify(data)}`,
          ),
        );
      };

      socket.once(event, onEvent);
      setTimeout(() => {
        socket.off(event, onEvent);
        resolve();
      }, waitMs);
    });
  };

  const emitWithAck = <T = unknown>(
    socket: Socket,
    event: string,
    data: unknown,
  ): Promise<T> => {
    return new Promise((resolve) => {
      socket.emit(event, data, (ack: T) => resolve(ack));
    });
  };

  describe('Connection & Authentication', () => {
    it('authenticates and connects with a valid bearer access token', async () => {
      const { accessToken } = await createAnonymousUser();
      const socket = await connectSocket(accessToken);

      expect(socket.connected).toBe(true);
    });

    it('rejects connection when token is invalid and emits session.error', async () => {
      const socket = io(`${baseUrl}/realtime`, {
        auth: { token: 'invalid.jwt.token' },
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });
      activeSockets.push(socket);

      const sessionError = await waitForEvent<{ errorCode: string }>(
        socket,
        'session.error',
      );

      expect(sessionError).toMatchObject({
        errorCode: 'UNAUTHENTICATED',
      });
      expect(socket.connected).toBe(false);
    });
  });

  describe('Room Subscription & Authorization', () => {
    it('allows a member to subscribe to list changes', async () => {
      const { accessToken } = await createAnonymousUser();
      const listId = randomUUID();

      await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Realtime List',
          updatedAt: new Date().toISOString(),
        })
        .expect(200);

      const socket = await connectSocket(accessToken);
      const ack = await emitWithAck<RealtimeSubscriptionAck>(
        socket,
        'list:subscribe',
        { listId },
      );

      expect(ack).toMatchObject({
        ok: true,
        listId,
      });
    });

    it('denies subscription if the user is not a member of the list', async () => {
      const owner = await createAnonymousUser();
      const nonMember = await createAnonymousUser();
      const listId = randomUUID();

      await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          name: 'Private List',
          updatedAt: new Date().toISOString(),
        })
        .expect(200);

      const socket = await connectSocket(nonMember.accessToken);
      const ack = await emitWithAck<RealtimeSubscriptionAck>(
        socket,
        'list:subscribe',
        { listId },
      );

      expect(ack).toMatchObject({
        ok: false,
        listId,
        errorCode: 'LIST_ACCESS_DENIED',
      });
    });
  });

  describe('Realtime Collaboration & Event Delivery', () => {
    it('broadcasts item changes over WebSockets when mutations occur via HTTP', async () => {
      const owner = await createAnonymousUser();
      const collaborator = await createAnonymousUser();
      const listId = randomUUID();

      await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          name: 'Grocery Trip',
          updatedAt: new Date().toISOString(),
        })
        .expect(200);

      const inviteRes = await request(app.getHttpServer())
        .post(`/api/v1/lists/${listId}/invites`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/invites/join')
        .set('Authorization', `Bearer ${collaborator.accessToken}`)
        .send({ credential: inviteRes.body.inviteCode })
        .expect(200);

      const collaboratorSocket = await connectSocket(collaborator.accessToken);
      const subAck = await emitWithAck<RealtimeSubscriptionAck>(
        collaboratorSocket,
        'list:subscribe',
        { listId },
      );
      expect(subAck.ok).toBe(true);

      const itemId = randomUUID();
      const receivedEventPromise = waitForEvent<ListChangedBroadcastPayload>(
        collaboratorSocket,
        'list.changed',
      );

      await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}/items/${itemId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          title: 'Organic Apples',
          isCompleted: false,
          position: 0,
          updatedAt: new Date().toISOString(),
        })
        .expect(200);

      const payload = await receivedEventPromise;
      expect(payload).toMatchObject({
        listId,
        entity: 'item',
        entityId: itemId,
        action: 'upserted',
      });
      expect(payload.data).toMatchObject({
        id: itemId,
        title: 'Organic Apples',
        isCompleted: false,
      });
    });

    it('ejects removed members and halts subsequent event broadcasts to them', async () => {
      const owner = await createAnonymousUser();
      const collaborator = await createAnonymousUser();
      const listId = randomUUID();

      await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          name: 'Shared Project',
          updatedAt: new Date().toISOString(),
        })
        .expect(200);

      const inviteRes = await request(app.getHttpServer())
        .post(`/api/v1/lists/${listId}/invites`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/invites/join')
        .set('Authorization', `Bearer ${collaborator.accessToken}`)
        .send({ credential: inviteRes.body.inviteCode })
        .expect(200);

      const collaboratorSocket = await connectSocket(collaborator.accessToken);
      await emitWithAck<RealtimeSubscriptionAck>(
        collaboratorSocket,
        'list:subscribe',
        { listId },
      );

      // Collaborator should receive the member removal notification
      const removalEventPromise = waitForEvent<ListChangedBroadcastPayload>(
        collaboratorSocket,
        'list.changed',
      );

      await request(app.getHttpServer())
        .delete(`/api/v1/lists/${listId}/members/${collaborator.userId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(204);

      const removalPayload = await removalEventPromise;
      expect(removalPayload).toMatchObject({
        listId,
        entity: 'member',
        entityId: collaborator.userId,
        action: 'deleted',
      });

      // Collaborator was ejected from room, so further events should NOT arrive
      const secondItemId = randomUUID();
      const noEventPromise = expectNoEvent(collaboratorSocket, 'list.changed');

      await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}/items/${secondItemId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          title: 'Secret Item',
          isCompleted: false,
          position: 1,
          updatedAt: new Date().toISOString(),
        })
        .expect(200);

      await noEventPromise;
    });

    it('stops delivering events after client explicitly unsubscribes', async () => {
      const owner = await createAnonymousUser();
      const listId = randomUUID();

      await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          name: 'Mute Test List',
          updatedAt: new Date().toISOString(),
        })
        .expect(200);

      const socket = await connectSocket(owner.accessToken);
      const subAck = await emitWithAck<RealtimeSubscriptionAck>(
        socket,
        'list:subscribe',
        { listId },
      );
      expect(subAck.ok).toBe(true);

      const unsubAck = await emitWithAck<RealtimeSubscriptionAck>(
        socket,
        'list:unsubscribe',
        { listId },
      );
      expect(unsubAck).toMatchObject({
        ok: true,
        listId,
      });

      const noEventPromise = expectNoEvent(socket, 'list.changed');

      await request(app.getHttpServer())
        .put(`/api/v1/lists/${listId}/items/${randomUUID()}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          title: 'Ignored Item Update',
          isCompleted: false,
          position: 0,
          updatedAt: new Date().toISOString(),
        })
        .expect(200);

      await noEventPromise;
    });
  });
});
