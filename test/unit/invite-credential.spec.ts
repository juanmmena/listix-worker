import { InviteCredential } from '../../src/modules/invites/domain/invite-credential';
import { InvalidTokenFormatError } from '../../src/modules/invites/domain/invites.errors';

describe('InviteCredential Value Object', () => {
  describe('parse', () => {
    it('classifies an 8-character alphanumeric string as an invite code (Rule V-6)', () => {
      const credential = InviteCredential.parse('k7m4xp2q');
      expect(credential.kind).toBe('code');
      expect(credential.value).toBe('K7M4XP2Q');
    });

    it('classifies a 64-hex character string as a link token (Rule V-6)', () => {
      const rawToken =
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const credential = InviteCredential.parse(rawToken);
      expect(credential.kind).toBe('token');
      expect(credential.value).toBe(rawToken);
    });

    it('classifies url-safe strings of length 6-128 as tokens', () => {
      const shortToken = 'abcdef';
      const credential = InviteCredential.parse(shortToken);
      expect(credential.kind).toBe('token');
      expect(credential.value).toBe('abcdef');
    });

    it('trims leading and trailing whitespace before parsing', () => {
      const credential = InviteCredential.parse('   K7M4XP2Q   ');
      expect(credential.kind).toBe('code');
      expect(credential.value).toBe('K7M4XP2Q');
    });

    it('throws InvalidTokenFormatError for credentials with invalid characters', () => {
      expect(() => InviteCredential.parse('inv@lid!')).toThrow(
        InvalidTokenFormatError,
      );
      expect(() => InviteCredential.parse('abc def')).toThrow(
        InvalidTokenFormatError,
      );
    });

    it('throws InvalidTokenFormatError for empty or whitespace-only inputs', () => {
      expect(() => InviteCredential.parse('')).toThrow(InvalidTokenFormatError);
      expect(() => InviteCredential.parse('    ')).toThrow(
        InvalidTokenFormatError,
      );
    });

    it('throws InvalidTokenFormatError for strings shorter than 6 characters', () => {
      expect(() => InviteCredential.parse('abc')).toThrow(
        InvalidTokenFormatError,
      );
      expect(() => InviteCredential.parse('12345')).toThrow(
        InvalidTokenFormatError,
      );
    });
  });

  describe('masked', () => {
    it('masks short codes with three asterisks (Rule V-10)', () => {
      const credential = InviteCredential.parse('K7M4XP2Q');
      expect(credential.masked()).toBe('***');
    });

    it('masks long secret tokens showing only first and last 4 characters (Rule V-10)', () => {
      const rawToken =
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const credential = InviteCredential.parse(rawToken);
      expect(credential.masked()).toBe('e3b0…b855');
    });
  });
});
