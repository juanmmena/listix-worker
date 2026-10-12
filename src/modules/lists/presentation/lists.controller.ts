import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/application/access-token.service';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { DeleteListUseCase } from '../application/delete-list.use-case';
import { GetListSnapshotUseCase } from '../application/get-list-snapshot.use-case';
import { GetMyListsUseCase } from '../application/get-my-lists.use-case';
import { SyncListUseCase } from '../application/sync-list.use-case';
import { SyncListDto } from './lists.dto';
import { ListPresenter, SnapshotPresenter } from './lists.presenter';

@Controller('lists')
export class ListsController {
  constructor(
    private readonly getMyLists: GetMyListsUseCase,
    private readonly syncList: SyncListUseCase,
    private readonly getSnapshot: GetListSnapshotUseCase,
    private readonly deleteList: DeleteListUseCase,
  ) {}

  @Get()
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    const lists = await this.getMyLists.execute(user.userId);
    return lists.map(ListPresenter.toResponse);
  }

  @Put(':listId')
  async sync(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: SyncListDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.syncList.execute({
      listId,
      userId: user.userId,
      name: dto.name,
      isStarred: dto.isStarred,
      position: dto.position,
      clientUpdatedAt: new Date(dto.updatedAt),
    });
    return {
      applied: result.applied,
      created: result.created,
      list: ListPresenter.toResponse(result.list),
    };
  }

  @Get(':listId')
  async snapshot(
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return SnapshotPresenter.toResponse(
      await this.getSnapshot.execute({ listId, userId: user.userId }),
    );
  }

  @Delete(':listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.deleteList.execute({ listId, userId: user.userId });
  }
}
