import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { httpStatusFor } from '../../../shared/presentation/error-status.map';
import type { AuthenticatedUser } from '../../auth/application/access-token.service';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { Public } from '../../auth/presentation/public.decorator';
import { SnapshotPresenter } from '../../lists/presentation/lists.presenter';
import { JoinListUseCase } from '../application/join-list.use-case';
import { ValidateInviteUseCase } from '../application/validate-invite.use-case';
import { JoinListDto } from './join-list.dto';

@Controller('invites')
@UseGuards(ThrottlerGuard)
export class InvitesController {
  constructor(
    private readonly validateInvite: ValidateInviteUseCase,
    private readonly joinList: JoinListUseCase,
  ) {}

  @Public()
  @Get(':credential')
  async validate(
    @Param('credential') credential: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.validateInvite.execute(credential);
    response.status(result.valid ? HttpStatus.OK : httpStatusFor(result.errorCode ?? ''));
    return result;
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  async join(@Body() dto: JoinListDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.joinList.execute({ ...dto, userId: user.userId });
    return { alreadyMember: result.alreadyMember, ...SnapshotPresenter.toResponse(result) };
  }
}
