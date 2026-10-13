import { Module } from '@nestjs/common';
import { InvitesModule } from '../invites/invites.module';
import { InviteLandingController } from './presentation/invite-landing.controller';

@Module({
  imports: [InvitesModule],
  controllers: [InviteLandingController],
})
export class PublicWebModule {}
