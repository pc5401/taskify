import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TransactionsService } from './transactions.service';

@Module({
  providers: [PrismaService, TransactionsService],
  exports: [PrismaService, TransactionsService],
})
export class PersistenceModule {}
