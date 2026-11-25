import { In } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationGateway } from './notification.gateway';

describe('NotificationsService (user-scoped isolation)', () => {
  function createService() {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const notificationRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const service = new NotificationsService(
      notificationRepository as any,
      {} as any,
      {} as any,
      { emitNotification: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    return { service, notificationRepository, qb };
  }

  it('findByUserId without query filters by userId', async () => {
    const { service, notificationRepository } = createService();
    await service.findByUserId('user-123');

    expect(notificationRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-123' },
      }),
    );
  });

  it('findByUserId with query filters QueryBuilder by userId', async () => {
    const { service, qb } = createService();
    await service.findByUserId('user-123', { page: 1, limit: 20 } as any);

    expect(qb.where).toHaveBeenCalledWith('notification.userId = :userId', {
      userId: 'user-123',
    });
  });

  it('findByUserId returns empty when userId is missing', async () => {
    const { service, notificationRepository } = createService();
    const res = await service.findByUserId('');

    expect(res).toEqual([]);
    expect(notificationRepository.find).not.toHaveBeenCalled();
  });

  it('markAllAsRead scopes update to userId', async () => {
    const { service, notificationRepository } = createService();
    await service.markAllAsRead('user-123');

    expect(notificationRepository.update).toHaveBeenCalledWith(
      { userId: 'user-123', isRead: false },
      { isRead: true },
    );
  });

  it('markAsRead, findById, delete, and deleteBulk scope to userId', async () => {
    const { service, notificationRepository } = createService();

    await service.findById('n-1', 'user-123');
    expect(notificationRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'n-1', userId: 'user-123' } }),
    );

    await service.markAsRead('n-1', 'user-123');
    expect(notificationRepository.update).toHaveBeenCalledWith(
      { id: 'n-1', userId: 'user-123' },
      { isRead: true },
    );

    await service.delete('n-1', 'user-123');
    expect(notificationRepository.delete).toHaveBeenCalledWith({
      id: 'n-1',
      userId: 'user-123',
    });

    await service.deleteBulk(['n-1', 'n-2'], 'user-123');
    expect(notificationRepository.delete).toHaveBeenCalledWith({
      id: In(['n-1', 'n-2']),
      userId: 'user-123',
    });
  });
});

describe('NotificationGateway', () => {
  it('emits notification.created only to target user room', () => {
    const gateway = new NotificationGateway();
    const emitMock = jest.fn();
    const toMock = jest.fn().mockReturnValue({ emit: emitMock });
    gateway.server = { to: toMock, emit: jest.fn() } as any;

    gateway.emitNotification({
      type: 'notification.created',
      data: { id: 'n-1', userId: 'user-123' },
    });

    expect(toMock).toHaveBeenCalledWith('user:user-123');
    expect(emitMock).toHaveBeenCalledWith('notification.created', {
      type: 'notification.created',
      data: { id: 'n-1', userId: 'user-123' },
    });
  });
});
