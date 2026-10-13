import { ListsService } from './lists.service';
import { ShoppingList } from '../domain/shopping-list';

describe('ListsService', () => {
  let service: ListsService;
  let transactions: any;
  let lists: any;
  let members: any;
  let items: any;
  let access: any;
  let events: any;
  let clock: any;

  beforeEach(() => {
    transactions = { run: jest.fn((work) => work()) };
    lists = {
      findActiveForMember: jest.fn(),
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    members = {
      findByList: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
    };
    items = {
      findActiveByList: jest.fn(),
    };
    access = {
      requireMember: jest.fn().mockResolvedValue(undefined),
      requireActiveList: jest.fn(),
    };
    events = {
      publish: jest.fn(),
    };
    clock = {
      now: jest.fn().mockReturnValue(new Date('2026-10-12T00:00:00.000Z')),
    };

    service = new ListsService(transactions, lists, members, items, access, events, clock);
  });

  describe('findMine', () => {
    it('returns active lists for member', async () => {
      const mockLists = [
        ShoppingList.create('list-1', 'u1', { name: 'Groceries' }, new Date()),
      ];
      lists.findActiveForMember.mockResolvedValue(mockLists);

      const result = await service.findMine('u1');
      expect(result).toEqual(mockLists);
      expect(lists.findActiveForMember).toHaveBeenCalledWith('u1');
    });
  });

  describe('sync', () => {
    it('creates a new list if it does not exist', async () => {
      lists.findById.mockResolvedValue(null);

      const result = await service.sync({
        listId: 'list-1',
        userId: 'u1',
        name: 'Groceries',
        clientUpdatedAt: new Date('2026-10-12T00:00:00.000Z'),
      });

      expect(result.created).toBe(true);
      expect(result.applied).toBe(true);
      expect(lists.save).toHaveBeenCalled();
      expect(members.add).toHaveBeenCalled();
      expect(events.publish).toHaveBeenCalled();
    });
  });
});
