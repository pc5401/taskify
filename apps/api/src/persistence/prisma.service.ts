import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  // Lazy connection: the BE-1 module can boot without a database.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
