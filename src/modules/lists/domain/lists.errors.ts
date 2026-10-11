import { DomainError } from '../../../shared/domain/domain-error';

export class ListNotFoundError extends DomainError {
  readonly code = 'LIST_NOT_FOUND';

  constructor() {
    super('The requested list was not found.');
  }
}

export class ItemNotFoundError extends DomainError {
  readonly code = 'ITEM_NOT_FOUND';

  constructor() {
    super('The requested item was not found.');
  }
}

export class MemberNotFoundError extends DomainError {
  readonly code = 'MEMBER_NOT_FOUND';

  constructor() {
    super('The requested list member was not found.');
  }
}

export class ListAccessDeniedError extends DomainError {
  readonly code = 'LIST_ACCESS_DENIED';

  constructor() {
    super('You do not have access to this list.');
  }
}

export class PermissionDeniedError extends DomainError {
  readonly code = 'PERMISSION_DENIED';

  constructor() {
    super('You do not have permission to perform this action.');
  }
}

export class MemberLimitReachedError extends DomainError {
  readonly code = 'MEMBER_LIMIT_REACHED';

  constructor() {
    super('This list has reached the maximum of 5 members.');
  }
}

export class OwnerCannotLeaveError extends DomainError {
  readonly code = 'OWNER_CANNOT_LEAVE';

  constructor() {
    super('The owner cannot leave or be removed from the list.');
  }
}

export class InvalidRoleChangeError extends DomainError {
  readonly code = 'INVALID_ROLE_CHANGE';

  constructor() {
    super('The requested member role change is invalid.');
  }
}

export class InvalidListNameError extends DomainError {
  readonly code = 'VALIDATION_FAILED';

  constructor() {
    super('List name must not be blank.');
  }
}

export class InvalidItemTitleError extends DomainError {
  readonly code = 'VALIDATION_FAILED';

  constructor() {
    super('Item title must not be blank.');
  }
}
