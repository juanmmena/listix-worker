import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/application/access-token.service';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { ChangeMemberRoleUseCase } from '../application/change-member-role.use-case';
import { ListAccessService } from '../application/list-access.service';
import { RemoveMemberUseCase } from '../application/remove-member.use-case';
import { ListMemberRepository } from '../domain/repositories';
import { ChangeMemberRoleDto } from './lists.dto';
import { MemberPresenter } from './lists.presenter';

@Controller('lists/:listId/members')
export class MembersController {
  constructor(
    private readonly access: ListAccessService,
    private readonly members: ListMemberRepository,
    private readonly changeRole: ChangeMemberRoleUseCase,
    private readonly removeMember: RemoveMemberUseCase,
  ) {}

  @Get()
  async findByList(
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.requireMember(listId, user.userId);
    const members = await this.members.findByList(listId);
    return members.map(MemberPresenter.toResponse);
  }

  @Patch(':userId')
  async updateRole(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: ChangeMemberRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const member = await this.changeRole.execute({
      listId,
      actorUserId: user.userId,
      targetUserId,
      role: dto.role,
    });
    return MemberPresenter.toResponse(member);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.removeMember.execute({
      listId,
      actorUserId: user.userId,
      targetUserId: user.userId,
    });
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.removeMember.execute({
      listId,
      actorUserId: user.userId,
      targetUserId,
    });
  }
}
