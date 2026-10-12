import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('BE-1 skeleton (DB-free boot)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.AUTH_JWT_SECRET = 'test-only-secret-at-least-32-bytes-long';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.AUTH_JWT_SECRET;
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(404);
  });
});
