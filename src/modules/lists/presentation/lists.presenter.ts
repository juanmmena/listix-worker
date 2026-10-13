import type { ListSnapshot } from '../application/lists.service';
import { ListItem } from '../domain/list-item';
import { ListMember } from '../domain/list-member';
import { ShoppingList } from '../domain/shopping-list';

export interface ListResponse {
  id: string;
  name: string;
  isStarred: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListItemResponse {
  id: string;
  title: string;
  isCompleted: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListMemberResponse {
  userId: string;
  role: string;
  displayName: string;
  email: string | null;
  joinedAt: string;
}

export interface ListSnapshotResponse {
  list: ListResponse;
  items: ListItemResponse[];
  members: ListMemberResponse[];
  serverTime: string;
}

export const ListPresenter = {
  toResponse(list: ShoppingList): ListResponse {
    return {
      id: list.id,
      name: list.name,
      isStarred: list.isStarred,
      position: list.position,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
    };
  },
};

export const ItemPresenter = {
  toResponse(item: ListItem): ListItemResponse {
    return {
      id: item.id,
      title: item.title,
      isCompleted: item.isCompleted,
      position: item.position,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  },
};

export const MemberPresenter = {
  toResponse(member: ListMember): ListMemberResponse {
    return {
      userId: member.userId,
      role: member.role,
      displayName: member.displayName,
      email: member.email,
      joinedAt: member.joinedAt.toISOString(),
    };
  },
};

export const SnapshotPresenter = {
  toResponse(snapshot: ListSnapshot): ListSnapshotResponse {
    return {
      list: ListPresenter.toResponse(snapshot.list),
      items: snapshot.items.map(ItemPresenter.toResponse),
      members: snapshot.members.map(MemberPresenter.toResponse),
      serverTime: snapshot.serverTime.toISOString(),
    };
  },
};
