import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListsModule } from '../lists/lists.module';
import { RealtimeEventListener } from './application/realtime-event.listener';
import { RealtimeGateway } from './presentation/realtime.gateway';

@Module({
  imports: [AuthModule, ListsModule],
  providers: [RealtimeGateway, RealtimeEventListener],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
