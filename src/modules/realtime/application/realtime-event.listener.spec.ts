import { RealtimeEventListener } from './realtime-event.listener';
import { ListChangedEvent } from '../../lists/domain/list-changed.event';

describe('RealtimeEventListener', () => {
  let listener: RealtimeEventListener;
  let gateway: any;

  beforeEach(() => {
    gateway = {
      broadcastListChanged: jest.fn(),
      ejectAllFromRoom: jest.fn(),
      ejectUserFromRoom: jest.fn().mockResolvedValue(undefined),
    };

    listener = new RealtimeEventListener(gateway);
  });

  it('broadcasts item changes without room eviction', async () => {
    const event = new ListChangedEvent(
      'list-1',
      'item',
      'item-1',
      'upserted',
      new Date('2026-10-15T12:00:00.000Z'),
      { title: 'Apples' },
    );

    await listener.handleListChanged(event);

    expect(gateway.broadcastListChanged).toHaveBeenCalledWith(event);
    expect(gateway.ejectAllFromRoom).not.toHaveBeenCalled();
    expect(gateway.ejectUserFromRoom).not.toHaveBeenCalled();
  });

  it('ejects all sockets when a list is deleted', async () => {
    const event = new ListChangedEvent(
      'list-1',
      'list',
      'list-1',
      'deleted',
      new Date('2026-10-15T12:00:00.000Z'),
    );

    await listener.handleListChanged(event);

    expect(gateway.broadcastListChanged).toHaveBeenCalledWith(event);
    expect(gateway.ejectAllFromRoom).toHaveBeenCalledWith('list-1');
    expect(gateway.ejectUserFromRoom).not.toHaveBeenCalled();
  });

  it('ejects removed member socket when a member is deleted', async () => {
    const event = new ListChangedEvent(
      'list-1',
      'member',
      'user-target',
      'deleted',
      new Date('2026-10-15T12:00:00.000Z'),
    );

    await listener.handleListChanged(event);

    expect(gateway.broadcastListChanged).toHaveBeenCalledWith(event);
    expect(gateway.ejectAllFromRoom).not.toHaveBeenCalled();
    expect(gateway.ejectUserFromRoom).toHaveBeenCalledWith('list-1', 'user-target');
  });

  it('handles and catches errors without rethrowing', async () => {
    gateway.broadcastListChanged.mockImplementation(() => {
      throw new Error('Broadcast failure');
    });

    const event = new ListChangedEvent(
      'list-1',
      'item',
      'item-1',
      'upserted',
      new Date('2026-10-15T12:00:00.000Z'),
    );

    await expect(listener.handleListChanged(event)).resolves.not.toThrow();
  });
});
