import { Injectable } from '@nestjs/common';
import { ListRepository } from '../domain/repositories';
import { ShoppingList } from '../domain/shopping-list';

@Injectable()
export class GetMyListsUseCase {
  constructor(private readonly lists: ListRepository) {}

  async execute(userId: string): Promise<ShoppingList[]> {
    return this.lists.findActiveForMember(userId);
  }
}
