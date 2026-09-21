import { Module } from "@nestjs/common";
import { EventSubscribersService } from "./event-subscribers.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  providers: [EventSubscribersService],
  exports: [EventSubscribersService],
})
export class EventsModule {}
