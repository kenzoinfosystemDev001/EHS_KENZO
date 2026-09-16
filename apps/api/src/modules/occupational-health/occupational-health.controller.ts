import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common";
import { OccupationalHealthService } from "./occupational-health.service";
import { CreateHealthRecordDto } from "./dto/health.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@Controller("health")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class OccupationalHealthController {
  constructor(private readonly healthService: OccupationalHealthService) {}
  @Get() @RequirePermissions(Permissions.HEALTH_READ) getRecords(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.healthService.getRecords(user);
  }
  @Post() @RequirePermissions(Permissions.HEALTH_MANAGE) createRecord(
    @Body() dto: CreateHealthRecordDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.healthService.createRecord(dto, user);
  }
  @Get("user/:userId")
  @RequirePermissions(Permissions.HEALTH_READ)
  getUserHistory(
    @Param("userId") userId: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.healthService.getUserHistory(userId, user);
  }
}
