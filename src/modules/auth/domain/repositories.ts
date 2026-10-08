import { RefreshToken } from './refresh-token';
import { User } from './user';

export abstract class UserRepository {
  abstract save(user: User): Promise<void>;
  abstract findById(id: string): Promise<User | null>;
  abstract touch(id: string, at: Date): Promise<void>;
}

export abstract class RefreshTokenRepository {
  abstract create(token: RefreshToken): Promise<void>;
  abstract findByHash(tokenHash: string): Promise<RefreshToken | null>;
  abstract revoke(id: string, at: Date): Promise<void>;
  abstract revokeAllForUser(userId: string, at: Date): Promise<void>;
}
