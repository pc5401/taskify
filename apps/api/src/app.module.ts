import { Module } from '@nestjs/common';
import { PersistenceModule } from './persistence/persistence.module';
import { AuthSessionModule } from './auth/auth-session.module';
import { CardsModule } from './cards/cards.module';
import { BoardsModule } from './boards/boards.module';
import { APP_PIPE } from '@nestjs/core';
import { HttpException, ValidationPipe } from '@nestjs/common';

@Module({
  imports: [PersistenceModule, AuthSessionModule, BoardsModule, CardsModule],
  providers: [{ provide: APP_PIPE, useFactory: () => new ValidationPipe({
    exceptionFactory: () => new HttpException({ code: 'INVALID_INPUT', message: 'INVALID_INPUT', details: {} }, 422),
  }) }],
})
export class AppModule {}
