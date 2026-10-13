import { DatabaseHealthIndicator } from './database-health.indicator';

describe('DatabaseHealthIndicator', () => {
  let indicator: DatabaseHealthIndicator;
  let prismaMock: any;
  let healthMock: any;
  let indicatorCheckMock: any;

  beforeEach(() => {
    indicatorCheckMock = {
      up: jest.fn().mockReturnValue({ database: { status: 'up' } }),
      down: jest.fn().mockImplementation((data) => ({ database: { status: 'down', ...data } })),
    };
    healthMock = {
      check: jest.fn().mockReturnValue(indicatorCheckMock),
    };
    prismaMock = {
      $queryRaw: jest.fn(),
    };
    indicator = new DatabaseHealthIndicator(prismaMock, healthMock);
  });

  it('reports up when query succeeds', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ 1: 1 }]);

    const result = await indicator.isHealthy('database');

    expect(result).toEqual({ database: { status: 'up' } });
    expect(indicatorCheckMock.up).toHaveBeenCalled();
  });

  it('sanitizes empty invocation Prisma errors and returns clean message', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('\nInvalid `prisma.$queryRaw()` invocation:\n\n\n'));

    const result = await indicator.isHealthy('database');

    expect(result).toEqual({
      database: {
        status: 'down',
        message: 'Database connection refused or unreachable',
      },
    });
    expect(indicatorCheckMock.down).toHaveBeenCalledWith({
      message: 'Database connection refused or unreachable',
    });
  });

  it('preserves meaningful error messages after the Prisma prefix', async () => {
    prismaMock.$queryRaw.mockRejectedValue(
      new Error('\nInvalid `prisma.$queryRaw()` invocation:\n\nAuthentication failed'),
    );

    const result = await indicator.isHealthy('database');

    expect(result).toEqual({
      database: {
        status: 'down',
        message: 'Authentication failed',
      },
    });
  });
});
