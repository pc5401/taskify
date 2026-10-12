import { Module } from '@nestjs/common';
import { AuthSessionModule } from '../auth/auth-session.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';
import { BoardReadsService } from './board-reads.service';
@Module({ imports: [PersistenceModule, AuthSessionModule], controllers: [BoardsController], providers: [BoardsService, BoardReadsService] })
export class BoardsModule {}
