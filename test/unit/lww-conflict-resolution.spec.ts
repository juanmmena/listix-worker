import { ListItem } from '../../src/modules/lists/domain/list-item';
import {
  InvalidItemTitleError,
  InvalidListNameError,
} from '../../src/modules/lists/domain/lists.errors';
import { ShoppingList } from '../../src/modules/lists/domain/shopping-list';

describe('Last-Write-Wins (LWW) Conflict Resolution', () => {
  const t0 = new Date('2026-10-16T10:00:00.000Z');
  const tEarlier = new Date('2026-10-16T09:59:59.999Z');
  const tSame = new Date('2026-10-16T10:00:00.000Z');
  const tLater = new Date('2026-10-16T10:00:01.000Z');
  const tEvenLater = new Date('2026-10-16T10:00:02.000Z');

  describe('ShoppingList LWW Invariants', () => {
    it('validates non-blank list names on creation', () => {
      expect(() =>
        ShoppingList.create('list-1', 'user-1', { name: '   ' }, t0),
      ).toThrow(InvalidListNameError);
    });

    it('rejects changes with timestamp older than current updatedAt (Rule L-2)', () => {
      const list = ShoppingList.create(
        'list-1',
        'user-1',
        { name: 'Groceries' },
        t0,
      );
      expect(list.acceptsChangeAt(tEarlier)).toBe(false);
    });

    it('accepts changes with identical or newer timestamps (Rule L-2)', () => {
      const list = ShoppingList.create(
        'list-1',
        'user-1',
        { name: 'Groceries' },
        t0,
      );
      expect(list.acceptsChangeAt(tSame)).toBe(true);
      expect(list.acceptsChangeAt(tLater)).toBe(true);
    });

    it('advances updatedAt when changes are applied', () => {
      const list = ShoppingList.create(
        'list-1',
        'user-1',
        { name: 'Groceries' },
        t0,
      );
      const updated = list.applyChanges({ name: 'Supermarket' }, tLater);
      expect(updated.name).toBe('Supermarket');
      expect(updated.updatedAt).toEqual(tLater);
      expect(updated.acceptsChangeAt(t0)).toBe(false);
    });

    it('tracks soft deletion with updated timestamp', () => {
      const list = ShoppingList.create(
        'list-1',
        'user-1',
        { name: 'Groceries' },
        t0,
      );
      expect(list.isDeleted).toBe(false);

      const deleted = list.markDeleted(tLater);
      expect(deleted.isDeleted).toBe(true);
      expect(deleted.deletedAt).toEqual(tLater);
      expect(deleted.updatedAt).toEqual(tLater);
    });
  });

  describe('ListItem LWW Invariants & Resurrection', () => {
    it('validates non-blank item titles on creation', () => {
      expect(() =>
        ListItem.create('item-1', 'list-1', { title: '  ' }, t0),
      ).toThrow(InvalidItemTitleError);
    });

    it('rejects item edits with older timestamps (Rule L-2)', () => {
      const item = ListItem.create('item-1', 'list-1', { title: 'Milk' }, t0);
      expect(item.acceptsChangeAt(tEarlier)).toBe(false);
    });

    it('accepts item edits with identical or newer timestamps', () => {
      const item = ListItem.create('item-1', 'list-1', { title: 'Milk' }, t0);
      expect(item.acceptsChangeAt(tSame)).toBe(true);
      expect(item.acceptsChangeAt(tLater)).toBe(true);
    });

    it('marks item as soft deleted (Rule L-7)', () => {
      const item = ListItem.create('item-1', 'list-1', { title: 'Milk' }, t0);
      const deleted = item.markDeleted(tLater);

      expect(deleted.isDeleted).toBe(true);
      expect(deleted.deletedAt).toEqual(tLater);
      expect(deleted.updatedAt).toEqual(tLater);
    });

    it('resurrects a deleted item when an edit has a newer timestamp (Rule L-8)', () => {
      const item = ListItem.create('item-1', 'list-1', { title: 'Milk' }, t0);
      const deleted = item.markDeleted(tLater);
      expect(deleted.isDeleted).toBe(true);

      expect(deleted.acceptsChangeAt(tEvenLater)).toBe(true);
      const resurrected = deleted.applyChanges(
        { title: 'Organic Milk', isCompleted: true },
        tEvenLater,
      );

      expect(resurrected.isDeleted).toBe(false);
      expect(resurrected.deletedAt).toBeNull();
      expect(resurrected.title).toBe('Organic Milk');
      expect(resurrected.isCompleted).toBe(true);
      expect(resurrected.updatedAt).toEqual(tEvenLater);
    });

    it('rejects edit if deletion timestamp is newer (Rule L-8)', () => {
      const item = ListItem.create('item-1', 'list-1', { title: 'Milk' }, t0);
      const deleted = item.markDeleted(tEvenLater);

      expect(deleted.acceptsChangeAt(tLater)).toBe(false);
    });
  });
});
