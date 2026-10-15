import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  LIST_CHANGED_EVENT,
  ListChangedEvent,
} from '../../lists/domain/list-changed.event';
import { RealtimeGateway } from '../presentation/realtime.gateway';

@Injectable()
export class RealtimeEventListener {
  private readonly logger = new Logger(RealtimeEventListener.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  @OnEvent(LIST_CHANGED_EVENT)
  async handleListChanged(event: ListChangedEvent): Promise<void> {
    try {
      this.gateway.broadcastListChanged(event);

      if (event.entity === 'list' && event.action === 'deleted') {
        this.gateway.ejectAllFromRoom(event.listId);
      } else if (event.entity === 'member' && event.action === 'deleted') {
        await this.gateway.ejectUserFromRoom(event.listId, event.entityId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle realtime event for list ${event.listId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
