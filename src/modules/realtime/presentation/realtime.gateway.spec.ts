import { RealtimeGateway } from './realtime.gateway';
import { ListAccessDeniedError } from '../../lists/domain/lists.errors';
import { ListChangedEvent } from '../../lists/domain/list-changed.event';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let accessTokens: any;
  let listAccess: any;
  let server: any;
  let inNamespaceMock: any;

  beforeEach(() => {
    accessTokens = {
      verify: jest.fn().mockResolvedValue({ userId: 'user-123' }),
    };

    listAccess = {
      requireMember: jest.fn().mockResolvedValue(undefined),
    };

    inNamespaceMock = {
      socketsLeave: jest.fn(),
      fetchSockets: jest.fn().mockResolvedValue([]),
    };

    server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      in: jest.fn().mockReturnValue(inNamespaceMock),
    };

    gateway = new RealtimeGateway(accessTokens, listAccess);
    (gateway as any).server = server;
  });

  describe('handleConnection', () => {
    it('authenticates client successfully with auth.token', async () => {
      const client: any = {
        data: {},
        handshake: { auth: { token: 'valid-token' }, headers: {}, query: {} },
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(accessTokens.verify).toHaveBeenCalledWith('valid-token');
      expect(client.data.userId).toBe('user-123');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('authenticates client successfully with Bearer authorization header', async () => {
      const client: any = {
        data: {},
        handshake: { auth: {}, headers: { authorization: 'Bearer header-token' }, query: {} },
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(accessTokens.verify).toHaveBeenCalledWith('header-token');
      expect(client.data.userId).toBe('user-123');
    });

    it('authenticates client successfully with query.token', async () => {
      const client: any = {
        data: {},
        handshake: { auth: {}, headers: {}, query: { token: 'query-token' } },
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(accessTokens.verify).toHaveBeenCalledWith('query-token');
      expect(client.data.userId).toBe('user-123');
    });

    it('disconnects and emits session.error when token is missing', async () => {
      const client: any = {
        data: {},
        handshake: { auth: {}, headers: {}, query: {} },
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('session.error', { errorCode: 'UNAUTHENTICATED' });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnects and emits session.error when verification fails', async () => {
      accessTokens.verify.mockRejectedValue(new Error('Invalid token'));
      const client: any = {
        data: {},
        handshake: { auth: { token: 'bad-token' }, headers: {}, query: {} },
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('session.error', { errorCode: 'UNAUTHENTICATED' });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('subscribe', () => {
    it('subscribes user to list room when member', async () => {
      const client: any = {
        data: { userId: 'user-123' },
        join: jest.fn().mockResolvedValue(undefined),
      };

      const result = await gateway.subscribe(client, { listId: 'list-1' });

      expect(listAccess.requireMember).toHaveBeenCalledWith('list-1', 'user-123');
      expect(client.join).toHaveBeenCalledWith('list:list-1');
      expect(result).toEqual({ ok: true, listId: 'list-1' });
    });

    it('returns error when listId is missing', async () => {
      const client: any = {
        data: { userId: 'user-123' },
        join: jest.fn(),
      };

      const result = await gateway.subscribe(client, { listId: '' });

      expect(result).toEqual({ ok: false, listId: '', errorCode: 'VALIDATION_FAILED' });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('returns error when client has no userId', async () => {
      const client: any = {
        data: {},
        join: jest.fn(),
      };

      const result = await gateway.subscribe(client, { listId: 'list-1' });

      expect(result).toEqual({ ok: false, listId: 'list-1', errorCode: 'UNAUTHENTICATED' });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('returns domain error code when member check fails', async () => {
      listAccess.requireMember.mockRejectedValue(new ListAccessDeniedError());
      const client: any = {
        data: { userId: 'user-123' },
        join: jest.fn(),
      };

      const result = await gateway.subscribe(client, { listId: 'list-1' });

      expect(result).toEqual({ ok: false, listId: 'list-1', errorCode: 'LIST_ACCESS_DENIED' });
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('leaves list room', async () => {
      const client: any = {
        leave: jest.fn().mockResolvedValue(undefined),
      };

      const result = await gateway.unsubscribe(client, { listId: 'list-1' });

      expect(client.leave).toHaveBeenCalledWith('list:list-1');
      expect(result).toEqual({ ok: true, listId: 'list-1' });
    });
  });

  describe('broadcastListChanged', () => {
    it('broadcasts event payload to list room', () => {
      const event = new ListChangedEvent(
        'list-1',
        'item',
        'item-1',
        'upserted',
        new Date('2026-10-15T12:00:00.000Z'),
        { title: 'Milk' },
      );

      gateway.broadcastListChanged(event);

      expect(server.to).toHaveBeenCalledWith('list:list-1');
      expect(server.emit).toHaveBeenCalledWith('list.changed', {
        listId: 'list-1',
        entity: 'item',
        entityId: 'item-1',
        action: 'upserted',
        occurredAt: '2026-10-15T12:00:00.000Z',
        data: { title: 'Milk' },
      });
    });
  });

  describe('ejectAllFromRoom', () => {
    it('makes all sockets leave list room', () => {
      gateway.ejectAllFromRoom('list-1');

      expect(server.in).toHaveBeenCalledWith('list:list-1');
      expect(inNamespaceMock.socketsLeave).toHaveBeenCalledWith('list:list-1');
    });
  });

  describe('ejectUserFromRoom', () => {
    it('ejects only sockets belonging to target user', async () => {
      const socket1 = { data: { userId: 'user-1' }, leave: jest.fn() };
      const socket2 = { data: { userId: 'user-2' }, leave: jest.fn() };
      inNamespaceMock.fetchSockets.mockResolvedValue([socket1, socket2]);

      await gateway.ejectUserFromRoom('list-1', 'user-1');

      expect(socket1.leave).toHaveBeenCalledWith('list:list-1');
      expect(socket2.leave).not.toHaveBeenCalled();
    });
  });
});
