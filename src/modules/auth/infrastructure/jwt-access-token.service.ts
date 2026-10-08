import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Env } from '../../../config/env.schema';
import { AccessTokenService, AuthenticatedUser } from '../application/access-token.service';
import { UnauthenticatedError } from '../domain/auth.errors';

interface AccessTokenPayload {
  sub: string;
  typ: 'access';
}

@Injectable()
export class JwtAccessTokenService extends AccessTokenService {
  readonly ttlSeconds: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    super();
    this.ttlSeconds = config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
  }

  sign(userId: string): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId, typ: 'access' };
    return this.jwt.signAsync(payload);
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      if (payload.typ !== 'access') {
        throw new UnauthenticatedError();
      }
      return { userId: payload.sub };
    } catch {
      throw new UnauthenticatedError();
    }
  }
}
