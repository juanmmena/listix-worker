export const LIST_CHANGED_EVENT = 'list.changed';

export type ListChangeEntity = 'list' | 'item' | 'member';
export type ListChangeAction = 'upserted' | 'deleted';

export class ListChangedEvent {
  constructor(
    readonly listId: string,
    readonly entity: ListChangeEntity,
    readonly entityId: string,
    readonly action: ListChangeAction,
    readonly occurredAt: Date,
    readonly data?: Record<string, unknown>,
  ) {}
}
