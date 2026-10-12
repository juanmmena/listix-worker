import { DomainError } from '../../../shared/domain/domain-error';

export class InvalidTokenFormatError extends DomainError {
  readonly code = 'INVALID_TOKEN_FORMAT';

  constructor() {
    super('The invite token or code format is invalid.');
  }
}

export class InviteNotFoundError extends DomainError {
  readonly code = 'INVITE_NOT_FOUND';

  constructor() {
    super('The requested invitation was not found.');
  }
}

export class InviteRevokedError extends DomainError {
  readonly code = 'INVITE_REVOKED';

  constructor() {
    super('This invitation has been revoked.');
  }
}

export class InviteExpiredError extends DomainError {
  readonly code = 'INVITE_EXPIRED';

  constructor() {
    super('This invitation has expired.');
  }
}

export class InviteCodeCollisionError extends DomainError {
  readonly code = 'INVITE_CODE_COLLISION';

  constructor() {
    super('A collision occurred generating the invite code.');
  }
}
