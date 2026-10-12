import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { AuthSessionModule } from '../auth/auth-session.module';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
@Module({
  imports: [PersistenceModule, AuthSessionModule],
  providers: [CardsService],
  controllers: [CardsController],
})
export class CardsModule {}
