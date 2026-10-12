import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.schema';
import { ListsModule } from '../lists/lists.module';
import {
  CreateInviteUseCase,
  INVITE_SETTINGS,
  InviteSettings,
} from './application/create-invite.use-case';
import { InviteFinder } from './application/invite-finder';
import { JoinListUseCase } from './application/join-list.use-case';
import { RevokeInviteUseCase } from './application/revoke-invite.use-case';
import { ValidateInviteUseCase } from './application/validate-invite.use-case';
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
    CreateInviteUseCase,
    RevokeInviteUseCase,
    ValidateInviteUseCase,
    JoinListUseCase,
    {
      provide: INVITE_SETTINGS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): InviteSettings => ({
        ttlDays: config.get('INVITE_TTL_DAYS', { infer: true }),
        publicBaseUrl: config.get('PUBLIC_BASE_URL', { infer: true }),
      }),
    },
  ],
  exports: [ValidateInviteUseCase],
})
export class InvitesModule {}
