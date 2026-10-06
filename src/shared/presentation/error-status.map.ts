import { HttpStatus } from '@nestjs/common';

export const HTTP_STATUS_BY_ERROR_CODE: Readonly<Record<string, HttpStatus>> = {
  UNAUTHENTICATED: HttpStatus.UNAUTHORIZED,
  INVALID_REFRESH_TOKEN: HttpStatus.UNAUTHORIZED,
  LIST_ACCESS_DENIED: HttpStatus.FORBIDDEN,
  PERMISSION_DENIED: HttpStatus.FORBIDDEN,
  LIST_NOT_FOUND: HttpStatus.NOT_FOUND,
  ITEM_NOT_FOUND: HttpStatus.NOT_FOUND,
  MEMBER_NOT_FOUND: HttpStatus.NOT_FOUND,
  INVITE_NOT_FOUND: HttpStatus.NOT_FOUND,
  INVALID_TOKEN_FORMAT: HttpStatus.BAD_REQUEST,
  INVALID_ROLE_CHANGE: HttpStatus.BAD_REQUEST,
  VALIDATION_FAILED: HttpStatus.BAD_REQUEST,
  INVITE_REVOKED: HttpStatus.GONE,
  INVITE_EXPIRED: HttpStatus.GONE,
  MEMBER_LIMIT_REACHED: HttpStatus.CONFLICT,
  OWNER_CANNOT_LEAVE: HttpStatus.CONFLICT,
};

export function httpStatusFor(errorCode: string): HttpStatus {
  return HTTP_STATUS_BY_ERROR_CODE[errorCode] ?? HttpStatus.BAD_REQUEST;
}
