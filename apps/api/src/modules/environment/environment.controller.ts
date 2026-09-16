import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { EnvironmentService } from "./environment.service";
import { LogMetricDto } from "./dto/environment.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@Controller("environment")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class EnvironmentController {
  constructor(private readonly environmentService: EnvironmentService) {}
  @Get("metrics") @RequirePermissions(Permissions.ENVIRONMENT_READ) getMetrics(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.environmentService.getMetrics(user);
  }
  @Post("metrics")
  @RequirePermissions(Permissions.ENVIRONMENT_MANAGE)
  logMetric(
    @Body() dto: LogMetricDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.environmentService.logMetric(dto, user);
  }
  @Get("summary") @RequirePermissions(Permissions.ENVIRONMENT_READ) getSummary(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.environmentService.getSummary(user);
  }
}
