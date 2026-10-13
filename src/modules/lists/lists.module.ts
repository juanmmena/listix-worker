import { Module } from '@nestjs/common';
import { ItemsService } from './application/items.service';
import { ListAccessService } from './application/list-access.service';
import { ListEventPublisher } from './application/list-event.publisher';
import { ListsService } from './application/lists.service';
import { MembersService } from './application/members.service';
import {
  ListItemRepository,
  ListMemberRepository,
  ListRepository,
} from './domain/repositories';
import { EventEmitterListEventPublisher } from './infrastructure/event-emitter-list-event.publisher';
import { PrismaListItemRepository } from './infrastructure/prisma-list-item.repository';
import { PrismaListMemberRepository } from './infrastructure/prisma-list-member.repository';
import { PrismaListRepository } from './infrastructure/prisma-list.repository';
import { ItemsController } from './presentation/items.controller';
import { ListsController } from './presentation/lists.controller';
import { MembersController } from './presentation/members.controller';

@Module({
  controllers: [ListsController, ItemsController, MembersController],
  providers: [
    { provide: ListRepository, useClass: PrismaListRepository },
    { provide: ListMemberRepository, useClass: PrismaListMemberRepository },
    { provide: ListItemRepository, useClass: PrismaListItemRepository },
    { provide: ListEventPublisher, useClass: EventEmitterListEventPublisher },
    ListAccessService,
    ListsService,
    ItemsService,
    MembersService,
  ],
  exports: [
    ListRepository,
    ListMemberRepository,
    ListItemRepository,
    ListAccessService,
    ListEventPublisher,
    ListsService,
    ItemsService,
    MembersService,
  ],
})
export class ListsModule {}
