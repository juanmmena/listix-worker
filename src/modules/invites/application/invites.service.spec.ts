import { InvitesService } from './invites.service';
import { ListInvite } from '../domain/list-invite';
import { ShoppingList } from '../../lists/domain/shopping-list';

describe('InvitesService', () => {
  let service: InvitesService;
  let transactions: any;
  let invites: any;
  let finder: any;
  let lists: any;
  let members: any;
  let access: any;
  let listsService: any;
  let events: any;
  let crypto: any;
  let clock: any;
  const settings = {
    ttlDays: 7,
    publicBaseUrl: 'https://example.com',
  };

  beforeEach(() => {
    transactions = { run: jest.fn((work) => work()) };
    invites = {
      deactivateActive: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(undefined),
    };
    finder = {
      find: jest.fn(),
    };
    lists = {
      findById: jest.fn(),
    };
    members = {
      find: jest.fn(),
      countByList: jest.fn().mockResolvedValue(1),
      add: jest.fn().mockResolvedValue(undefined),
    };
    access = {
      requireMember: jest.fn().mockResolvedValue(undefined),
      requireActiveList: jest.fn().mockResolvedValue(undefined),
    };
    listsService = {
      getSnapshot: jest.fn().mockResolvedValue({
        list: ShoppingList.create('list-1', 'u1', { name: 'Groceries' }, new Date()),
        items: [],
        members: [],
        serverTime: new Date(),
      }),
    };
    events = {
      publish: jest.fn(),
    };
    crypto = {
      uuid: jest.fn().mockReturnValue('inv-1'),
      randomHex: jest.fn().mockReturnValue('token-hex'),
      sha256Hex: jest.fn().mockReturnValue('token-hash'),
      randomString: jest.fn().mockReturnValue('CODE1234'),
    };
    clock = {
      now: jest.fn().mockReturnValue(new Date('2026-10-12T00:00:00.000Z')),
    };

    service = new InvitesService(
      transactions,
      invites,
      finder,
      lists,
      members,
      access,
      listsService,
      events,
      crypto,
      clock,
      settings,
    );
  });

  describe('create', () => {
    it('generates an invite and persists it', async () => {
      const result = await service.create({
        listId: 'list-1',
        userId: 'u1',
      });

      expect(access.requireMember).toHaveBeenCalledWith('list-1', 'u1', expect.any(Array));
      expect(invites.deactivateActive).toHaveBeenCalledWith('list-1');
      expect(invites.create).toHaveBeenCalled();
      expect(result.inviteCode).toBe('CODE1234');
      expect(result.inviteUrl).toBe('https://example.com/join/token-hex');
    });
  });

  describe('validate', () => {
    it('returns valid: true for a valid invite', async () => {
      const now = new Date('2026-10-12T00:00:00.000Z');
      const expiresAt = new Date('2026-10-19T00:00:00.000Z');
      const mockInvite = ListInvite.issue({
        id: 'inv-1',
        listId: 'list-1',
        tokenHash: 'hash',
        inviteCode: 'CODE1234',
        createdBy: 'u1',
        expiresAt,
        createdAt: now,
      });

      finder.find.mockResolvedValue(mockInvite);
      lists.findById.mockResolvedValue(
        ShoppingList.create('list-1', 'u1', { name: 'Groceries' }, now),
      );
      members.countByList.mockResolvedValue(2);

      const result = await service.validate('CODE1234');
      expect(result.valid).toBe(true);
      expect(result.listName).toBe('Groceries');
      expect(result.memberCount).toBe(2);
    });
  });
});
