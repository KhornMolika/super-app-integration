import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SuperAppWebController } from './superapp-web.controller';
import { SuperAppWebService } from './superapp-web.service';

/** The newest web Super App build from Nexus (Backoffice preview and /preview/). */
@Module({
  imports: [ConfigModule],
  controllers: [SuperAppWebController],
  providers: [SuperAppWebService],
})
export class SuperAppWebModule {}
