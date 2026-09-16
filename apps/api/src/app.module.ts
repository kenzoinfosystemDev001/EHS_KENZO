import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AuditModule } from "./modules/audit/audit.module";
import { HealthModule } from "./modules/health/health.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { OutboxModule } from "./modules/outbox/outbox.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { HiraModule } from "./modules/hira/hira.module";
import { MasterDataModule } from "./modules/master-data/master-data.module";
import { InboxModule } from "./modules/inbox/inbox.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { IncidentModule } from "./modules/incident/incident.module";
import { RcaModule } from "./modules/rca/rca.module";
import { CapaModule } from "./modules/capa/capa.module";
import { PtwModule } from "./modules/ptw/ptw.module";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";

import { ObservationsModule } from "./modules/observations/observations.module";
import { ActionsModule } from "./modules/actions/actions.module";
import { LotoModule } from "./modules/loto/loto.module";
import { InspectionsModule } from "./modules/inspections/inspections.module";
import { AuditsModule } from "./modules/audits/audits.module";
import { TrainingModule } from "./modules/training/training.module";
import { ContractorsModule } from "./modules/contractors/contractors.module";
import { OccupationalHealthModule } from "./modules/occupational-health/occupational-health.module";
import { EnvironmentModule } from "./modules/environment/environment.module";
import { EmergencyModule } from "./modules/emergency/emergency.module";
import { ComplianceModule } from "./modules/compliance/compliance.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    HealthModule,
    WorkflowModule,
    OutboxModule,
    NotificationsModule,
    DocumentsModule,
    HiraModule,
    MasterDataModule,
    InboxModule,
    DashboardModule,
    IncidentModule,
    RcaModule,
    CapaModule,
    PtwModule,
    ObservationsModule,
    ActionsModule,
    LotoModule,
    InspectionsModule,
    AuditsModule,
    TrainingModule,
    ContractorsModule,
    OccupationalHealthModule,
    EnvironmentModule,
    EmergencyModule,
    ComplianceModule,
    AnalyticsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
