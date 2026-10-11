import { isAtOrAfter } from '../../../shared/domain/time';
import { InvalidListNameError } from './lists.errors';

export interface ShoppingListProps {
  id: string;
  name: string;
  createdBy: string;
  isStarred: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ListChanges {
  name: string;
  isStarred?: boolean;
  position?: number;
}

export class ShoppingList {
  private constructor(private readonly props: ShoppingListProps) {}

  static restore(props: ShoppingListProps): ShoppingList {
    return new ShoppingList({ ...props });
  }

  static create(id: string, createdBy: string, changes: ListChanges, at: Date): ShoppingList {
    return new ShoppingList({
      id,
      name: ShoppingList.validName(changes.name),
      createdBy,
      isStarred: changes.isStarred ?? false,
      position: changes.position ?? 0,
      createdAt: at,
      updatedAt: at,
      deletedAt: null,
    });
  }

  private static validName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new InvalidListNameError();
    }
    return trimmed;
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get isStarred(): boolean {
    return this.props.isStarred;
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

  applyChanges(changes: ListChanges, at: Date): ShoppingList {
    return new ShoppingList({
      ...this.props,
      name: ShoppingList.validName(changes.name),
      isStarred: changes.isStarred ?? this.props.isStarred,
      position: changes.position ?? this.props.position,
      updatedAt: at,
    });
  }

  markDeleted(at: Date): ShoppingList {
    return new ShoppingList({ ...this.props, deletedAt: at, updatedAt: at });
  }

  toPrimitives(): Readonly<ShoppingListProps> {
    return { ...this.props };
  }
}
