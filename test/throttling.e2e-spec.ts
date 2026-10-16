import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DatabaseHealthIndicator } from '../src/modules/health/database-health.indicator';
import { InvitesService } from '../src/modules/invites/application/invites.service';

describe('Throttling Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseHealthIndicator)
      .useValue({
        isHealthy: jest.fn().mockResolvedValue({
          database: { status: 'up' },
        }),
      })
      .overrideProvider(InvitesService)
      .useValue({
        validate: jest.fn().mockResolvedValue({
          valid: false,
          errorCode: 'INVALID_TOKEN_FORMAT',
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rate limits GET /api/v1/invites/:credential on the 31st request within TTL', async () => {
    const server = app.getHttpServer();

    for (let i = 1; i <= 30; i++) {
      const response = await request(server).get('/api/v1/invites/INVALID');
      expect(response.status).not.toBe(429);
      expect(response.body).toMatchObject({
        valid: false,
        errorCode: 'INVALID_TOKEN_FORMAT',
      });
    }

    const throttledResponse = await request(server).get(
      '/api/v1/invites/INVALID',
    );
    expect(throttledResponse.status).toBe(429);
    expect(throttledResponse.body).toMatchObject({
      statusCode: 429,
    });
  });

  it('keeps unthrottled routes accessible even after invite route is rate-limited', async () => {
    const server = app.getHttpServer();
    const healthResponse = await request(server).get('/health');
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body).toMatchObject({
      status: 'ok',
    });
  });
});
