import { ListChangedEvent } from '../domain/list-changed.event';

export abstract class ListEventPublisher {
  abstract publish(event: ListChangedEvent): void;
}
