import { AuthService } from './auth.service';
import { UnauthenticatedError } from '../domain/auth.errors';
import { User } from '../domain/user';

describe('AuthService', () => {
  let service: AuthService;
  let users: any;
  let refreshTokens: any;
  let sessions: any;
  let transactions: any;
  let crypto: any;
  let clock: any;

  beforeEach(() => {
    users = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      touch: jest.fn().mockResolvedValue(undefined),
    };
    refreshTokens = {
      findByHash: jest.fn(),
      revoke: jest.fn().mockResolvedValue(undefined),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };
    sessions = {
      issue: jest.fn().mockResolvedValue({
        userId: 'u1',
        accessToken: 'access-jwt',
        accessTokenExpiresIn: 900,
        refreshToken: 'refresh-token',
        refreshTokenExpiresAt: new Date(),
      }),
    };
    transactions = {
      run: jest.fn((work) => work()),
    };
    crypto = {
      uuid: jest.fn().mockReturnValue('u1'),
      sha256Hex: jest.fn().mockReturnValue('hash123'),
    };
    clock = {
      now: jest.fn().mockReturnValue(new Date('2026-10-12T00:00:00.000Z')),
    };

    service = new AuthService(users, refreshTokens, sessions, transactions, crypto, clock);
  });

  describe('signInAnonymously', () => {
    it('creates an anonymous user and issues a session', async () => {
      const result = await service.signInAnonymously();

      expect(users.save).toHaveBeenCalled();
      expect(sessions.issue).toHaveBeenCalledWith('u1');
      expect(result.userId).toBe('u1');
    });
  });

  describe('getCurrentUser', () => {
    it('returns the user if found', async () => {
      const user = User.anonymous('u1', new Date());
      users.findById.mockResolvedValue(user);

      const result = await service.getCurrentUser('u1');
      expect(result).toBe(user);
    });

    it('throws UnauthenticatedError if user is not found', async () => {
      users.findById.mockResolvedValue(null);

      await expect(service.getCurrentUser('u1')).rejects.toThrow(UnauthenticatedError);
    });
  });
});
