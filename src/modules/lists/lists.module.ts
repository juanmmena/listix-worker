import { Module } from '@nestjs/common';
import { ChangeMemberRoleUseCase } from './application/change-member-role.use-case';
import { DeleteItemUseCase } from './application/delete-item.use-case';
import { DeleteListUseCase } from './application/delete-list.use-case';
import { GetListSnapshotUseCase } from './application/get-list-snapshot.use-case';
import { GetMyListsUseCase } from './application/get-my-lists.use-case';
import { ListAccessService } from './application/list-access.service';
import { ListEventPublisher } from './application/list-event.publisher';
import { RemoveMemberUseCase } from './application/remove-member.use-case';
import { SyncListUseCase } from './application/sync-list.use-case';
import { UpsertItemUseCase } from './application/upsert-item.use-case';
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
    GetMyListsUseCase,
    SyncListUseCase,
    GetListSnapshotUseCase,
    DeleteListUseCase,
    UpsertItemUseCase,
    DeleteItemUseCase,
    ChangeMemberRoleUseCase,
    RemoveMemberUseCase,
  ],
  exports: [
    ListRepository,
    ListMemberRepository,
    ListAccessService,
    ListEventPublisher,
    GetListSnapshotUseCase,
  ],
})
export class ListsModule {}
