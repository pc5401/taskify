import { Module } from '@nestjs/common';
import { AuthSessionModule } from '../auth/auth-session.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';
@Module({ imports: [PersistenceModule, AuthSessionModule], controllers: [BoardsController], providers: [BoardsService] })
export class BoardsModule {}
