import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ListEventPublisher } from '../application/list-event.publisher';
import { LIST_CHANGED_EVENT, ListChangedEvent } from '../domain/list-changed.event';

@Injectable()
export class EventEmitterListEventPublisher extends ListEventPublisher {
  constructor(private readonly emitter: EventEmitter2) {
    super();
  }

  publish(event: ListChangedEvent): void {
    this.emitter.emit(LIST_CHANGED_EVENT, event);
  }
}
