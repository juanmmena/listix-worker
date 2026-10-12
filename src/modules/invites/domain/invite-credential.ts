import { InvalidTokenFormatError } from './invites.errors';

const INVITE_CODE_PATTERN = /^[A-Za-z0-9]{8}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;

export const INVITE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const INVITE_CODE_LENGTH = 8;
export const INVITE_TOKEN_BYTES = 32;

export type InviteCredentialKind = 'code' | 'token';

export class InviteCredential {
  private constructor(
    readonly kind: InviteCredentialKind,
    readonly value: string,
  ) {}

  static parse(raw: string): InviteCredential {
    const trimmed = (raw ?? '').trim();
    if (INVITE_CODE_PATTERN.test(trimmed)) {
      return new InviteCredential('code', trimmed.toUpperCase());
    }
    if (TOKEN_PATTERN.test(trimmed)) {
      return new InviteCredential('token', trimmed);
    }
    throw new InvalidTokenFormatError();
  }

  masked(): string {
    return this.value.length <= 8 ? '***' : `${this.value.slice(0, 4)}…${this.value.slice(-4)}`;
  }
}
