import { ListMember } from '../../src/modules/lists/domain/list-member';
import {
  InvalidRoleChangeError,
  MemberLimitReachedError,
  OwnerCannotLeaveError,
  PermissionDeniedError,
} from '../../src/modules/lists/domain/lists.errors';
import { MembershipPolicy } from '../../src/modules/lists/domain/membership.policy';

describe('MembershipPolicy', () => {
  const now = new Date('2026-10-16T12:00:00.000Z');
  const owner = ListMember.owner('list-1', 'user-owner', now);
  const admin = new ListMember(
    'list-1',
    'user-admin',
    'admin',
    'Admin',
    null,
    now,
  );
  const member = new ListMember(
    'list-1',
    'user-member',
    'member',
    'Member',
    null,
    now,
  );
  const otherMember = new ListMember(
    'list-1',
    'user-other',
    'member',
    'Other',
    null,
    now,
  );

  describe('assertHasCapacity', () => {
    it('allows joining when member count is below maximum of 5', () => {
      expect(() => MembershipPolicy.assertHasCapacity(0)).not.toThrow();
      expect(() => MembershipPolicy.assertHasCapacity(4)).not.toThrow();
    });

    it('refuses a sixth member when list already has 5 members (Rule M-2)', () => {
      expect(() => MembershipPolicy.assertHasCapacity(5)).toThrow(
        MemberLimitReachedError,
      );
      expect(() => MembershipPolicy.assertHasCapacity(6)).toThrow(
        MemberLimitReachedError,
      );
    });
  });

  describe('assertCanRemove', () => {
    it('allows a member to leave the list voluntarily (Rule M-4)', () => {
      expect(() =>
        MembershipPolicy.assertCanRemove(member, member),
      ).not.toThrow();
      expect(() =>
        MembershipPolicy.assertCanRemove(admin, admin),
      ).not.toThrow();
    });

    it('allows an owner or admin to remove another non-owner member (Rule M-4)', () => {
      expect(() =>
        MembershipPolicy.assertCanRemove(owner, member),
      ).not.toThrow();
      expect(() =>
        MembershipPolicy.assertCanRemove(owner, admin),
      ).not.toThrow();
      expect(() =>
        MembershipPolicy.assertCanRemove(admin, member),
      ).not.toThrow();
    });

    it('prevents regular members from removing other members', () => {
      expect(() =>
        MembershipPolicy.assertCanRemove(member, otherMember),
      ).toThrow(PermissionDeniedError);
    });

    it('strictly forbids the owner from leaving or being removed (Rule M-5)', () => {
      expect(() => MembershipPolicy.assertCanRemove(owner, owner)).toThrow(
        OwnerCannotLeaveError,
      );
      expect(() => MembershipPolicy.assertCanRemove(admin, owner)).toThrow(
        OwnerCannotLeaveError,
      );
    });
  });

  describe('assertCanChangeRole', () => {
    it('allows owner or admin to change roles between admin and member (Rule M-3)', () => {
      expect(() =>
        MembershipPolicy.assertCanChangeRole(owner, member, 'admin'),
      ).not.toThrow();
      expect(() =>
        MembershipPolicy.assertCanChangeRole(owner, admin, 'member'),
      ).not.toThrow();
      expect(() =>
        MembershipPolicy.assertCanChangeRole(admin, member, 'admin'),
      ).not.toThrow();
    });

    it('prevents regular members from changing any roles', () => {
      expect(() =>
        MembershipPolicy.assertCanChangeRole(member, otherMember, 'admin'),
      ).toThrow(PermissionDeniedError);
    });

    it('strictly forbids granting or removing the owner role (Rule M-3)', () => {
      expect(() =>
        MembershipPolicy.assertCanChangeRole(owner, member, 'owner'),
      ).toThrow(InvalidRoleChangeError);
      expect(() =>
        MembershipPolicy.assertCanChangeRole(owner, owner, 'admin'),
      ).toThrow(InvalidRoleChangeError);
    });
  });
});
