import { isAtOrAfter } from '../../../shared/domain/time';
import { InvalidItemTitleError } from './lists.errors';

export interface ListItemProps {
  id: string;
  listId: string;
  title: string;
  isCompleted: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ItemChanges {
  title: string;
  isCompleted?: boolean;
  position?: number;
}

export class ListItem {
  private constructor(private readonly props: ListItemProps) {}

  static restore(props: ListItemProps): ListItem {
    return new ListItem({ ...props });
  }

  static create(id: string, listId: string, changes: ItemChanges, at: Date): ListItem {
    return new ListItem({
      id,
      listId,
      title: ListItem.validTitle(changes.title),
      isCompleted: changes.isCompleted ?? false,
      position: changes.position ?? 0,
      createdAt: at,
      updatedAt: at,
      deletedAt: null,
    });
  }

  private static validTitle(title: string): string {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      throw new InvalidItemTitleError();
    }
    return trimmed;
  }

  get id(): string {
    return this.props.id;
  }

  get listId(): string {
    return this.props.listId;
  }

  get title(): string {
    return this.props.title;
  }

  get isCompleted(): boolean {
    return this.props.isCompleted;
  }

  get position(): number {
    return this.props.position;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  acceptsChangeAt(at: Date): boolean {
    return isAtOrAfter(at, this.props.updatedAt);
  }

  applyChanges(changes: ItemChanges, at: Date): ListItem {
    return new ListItem({
      ...this.props,
      title: ListItem.validTitle(changes.title),
      isCompleted: changes.isCompleted ?? this.props.isCompleted,
      position: changes.position ?? this.props.position,
      updatedAt: at,
      deletedAt: null,
    });
  }

  markDeleted(at: Date): ListItem {
    return new ListItem({
      ...this.props,
      deletedAt: at,
      updatedAt: at,
    });
  }

  toPrimitives(): Readonly<ListItemProps> {
    return { ...this.props };
  }
}
