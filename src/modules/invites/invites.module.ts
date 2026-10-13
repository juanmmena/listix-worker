import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.schema';
import { ListsModule } from '../lists/lists.module';
import {
  INVITE_SETTINGS,
  InviteSettings,
  InvitesService,
} from './application/invites.service';
import { InviteFinder } from './application/invite-finder';
import { InviteRepository } from './domain/invite.repository';
import { PrismaInviteRepository } from './infrastructure/prisma-invite.repository';
import { InvitesController } from './presentation/invites.controller';
import { ListInvitesController } from './presentation/list-invites.controller';

@Module({
  imports: [ListsModule],
  controllers: [InvitesController, ListInvitesController],
  providers: [
    { provide: InviteRepository, useClass: PrismaInviteRepository },
    InviteFinder,
    InvitesService,
    {
      provide: INVITE_SETTINGS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): InviteSettings => ({
        ttlDays: config.get('INVITE_TTL_DAYS', { infer: true }),
        publicBaseUrl: config.get('PUBLIC_BASE_URL', { infer: true }),
      }),
    },
  ],
  exports: [InvitesService],
})
export class InvitesModule {}
