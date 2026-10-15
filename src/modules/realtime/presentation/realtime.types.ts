import type { Socket } from 'socket.io';
import type { ListChangeAction, ListChangeEntity } from '../../lists/domain/list-changed.event';

export interface SocketData {
  userId: string;
}

export type AuthenticatedSocket = Socket & { data: SocketData };

export interface RealtimeSubscriptionAck {
  ok: boolean;
  listId: string;
  errorCode?: string;
}

export interface ListChangedBroadcastPayload {
  listId: string;
  entity: ListChangeEntity;
  entityId: string;
  action: ListChangeAction;
  occurredAt: string;
  data?: Record<string, unknown>;
}

export interface SessionErrorPayload {
  errorCode: string;
}
