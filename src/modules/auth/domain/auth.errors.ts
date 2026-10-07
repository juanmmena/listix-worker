import { DomainError } from '../../../shared/domain/domain-error';

export class UnauthenticatedError extends DomainError {
  readonly code = 'UNAUTHENTICATED';

  constructor() {
    super('Authentication is required.');
  }
}

export class InvalidRefreshTokenError extends DomainError {
  readonly code = 'INVALID_REFRESH_TOKEN';

  constructor() {
    super('The refresh token is invalid or expired.');
  }
}
