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
import { ListsService } from '../application/lists.service';
import { SyncListDto } from './lists.dto';
import { ListPresenter, SnapshotPresenter } from './lists.presenter';

@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Get()
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    const lists = await this.listsService.findMine(user.userId);
    return lists.map(ListPresenter.toResponse);
  }

  @Put(':listId')
  async sync(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: SyncListDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.listsService.sync({
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
      await this.listsService.getSnapshot({ listId, userId: user.userId }),
    );
  }

  @Delete(':listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.listsService.delete({ listId, userId: user.userId });
  }
}
