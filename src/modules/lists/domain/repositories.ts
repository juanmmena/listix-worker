import { ListItem } from './list-item';
import { ListMember } from './list-member';
import { ShoppingList } from './shopping-list';

export abstract class ListRepository {
  abstract findById(id: string): Promise<ShoppingList | null>;
  abstract findActiveForMember(userId: string): Promise<ShoppingList[]>;
  abstract save(list: ShoppingList): Promise<void>;
}

export abstract class ListMemberRepository {
  abstract find(listId: string, userId: string): Promise<ListMember | null>;
  abstract findByList(listId: string): Promise<ListMember[]>;
  abstract countByList(listId: string): Promise<number>;
  abstract add(member: ListMember): Promise<void>;
  abstract update(member: ListMember): Promise<void>;
  abstract remove(listId: string, userId: string): Promise<void>;
}

export abstract class ListItemRepository {
  abstract findById(id: string): Promise<ListItem | null>;
  abstract findActiveByList(listId: string): Promise<ListItem[]>;
  abstract save(item: ListItem): Promise<void>;
}
