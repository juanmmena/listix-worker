import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace } from 'socket.io';
import { DomainError } from '../../../shared/domain/domain-error';
import { AccessTokenService } from '../../auth/application/access-token.service';
import { ListAccessService } from '../../lists/application/list-access.service';
import type { ListChangedEvent } from '../../lists/domain/list-changed.event';
import { ListSubscriptionDto } from './dto/list-subscription.dto';
import type {
  AuthenticatedSocket,
  ListChangedBroadcastPayload,
  RealtimeSubscriptionAck,
} from './realtime.types';

@WebSocketGateway({ namespace: '/realtime', cors: { origin: true } })
@UsePipes(new ValidationPipe({ whitelist: true }))
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private readonly server!: Namespace;

  constructor(
    private readonly accessTokens: AccessTokenService,
    private readonly listAccess: ListAccessService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new Error('Missing token');
      }
      const user = await this.accessTokens.verify(token);
      client.data = { ...client.data, userId: user.userId };
    } catch {
      client.emit('session.error', { errorCode: 'UNAUTHENTICATED' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('list:subscribe')
  @SubscribeMessage('subscribe')
  async subscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ListSubscriptionDto,
  ): Promise<RealtimeSubscriptionAck> {
    const listId = body?.listId;
    if (!listId) {
      return { ok: false, listId: '', errorCode: 'VALIDATION_FAILED' };
    }

    const userId = client.data?.userId;
    if (!userId) {
      return { ok: false, listId, errorCode: 'UNAUTHENTICATED' };
    }

    try {
      await this.listAccess.requireMember(listId, userId);
      await client.join(this.getRoomName(listId));
      return { ok: true, listId };
    } catch (error) {
      const errorCode = error instanceof DomainError ? error.code : 'INTERNAL_ERROR';
      return { ok: false, listId, errorCode };
    }
  }

  @SubscribeMessage('list:unsubscribe')
  @SubscribeMessage('unsubscribe')
  async unsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ListSubscriptionDto,
  ): Promise<RealtimeSubscriptionAck> {
    const listId = body?.listId;
    if (!listId) {
      return { ok: false, listId: '', errorCode: 'VALIDATION_FAILED' };
    }

    await client.leave(this.getRoomName(listId));
    return { ok: true, listId };
  }

  getRoomName(listId: string): string {
    return `list:${listId}`;
  }

  broadcastListChanged(event: ListChangedEvent): void {
    const room = this.getRoomName(event.listId);
    const payload: ListChangedBroadcastPayload = {
      listId: event.listId,
      entity: event.entity,
      entityId: event.entityId,
      action: event.action,
      occurredAt: event.occurredAt.toISOString(),
    };

    if (event.data !== undefined) {
      payload.data = event.data;
    }

    this.server.to(room).emit('list.changed', payload);
  }

  ejectAllFromRoom(listId: string): void {
    const room = this.getRoomName(listId);
    this.server.in(room).socketsLeave(room);
  }

  async ejectUserFromRoom(listId: string, userId: string): Promise<void> {
    const room = this.getRoomName(listId);
    const sockets = await this.server.in(room).fetchSockets();
    for (const socket of sockets) {
      if (socket.data?.userId === userId) {
        socket.leave(room);
      }
    }
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const authHeader = client.handshake.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.trim().length > 0) {
      const parts = authHeader.trim().split(' ');
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
        return parts[1];
      }
      return authHeader.trim();
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim().length > 0) {
      return queryToken.trim();
    }

    return null;
  }
}
