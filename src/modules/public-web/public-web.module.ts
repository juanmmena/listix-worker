import { Module } from '@nestjs/common';
import { InvitesModule } from '../invites/invites.module';
import { InviteLandingController } from './presentation/invite-landing.controller';
import { WellKnownController } from './presentation/well-known.controller';

@Module({
  imports: [InvitesModule],
  controllers: [InviteLandingController, WellKnownController],
})
export class PublicWebModule {}
