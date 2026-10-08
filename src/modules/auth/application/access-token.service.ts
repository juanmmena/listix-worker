export interface AuthenticatedUser {
  userId: string;
}

export abstract class AccessTokenService {
  abstract readonly ttlSeconds: number;
  abstract sign(userId: string): Promise<string>;
  abstract verify(token: string): Promise<AuthenticatedUser>;
}
