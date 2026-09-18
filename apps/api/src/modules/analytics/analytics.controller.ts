import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { LogManhoursDto } from "./dto/analytics.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@Controller(["analytics", "reports"])
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @RequirePermissions(Permissions.REPORTS_READ)
  getReports(@CurrentUser() user: AuthenticatedUserContext) {
    return this.analyticsService.getReports(user);
  }

  @Post()
  @RequirePermissions(Permissions.REPORTS_READ)
  logReportManhours(
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.analyticsService.logManhours(dto, user);
  }
  @Get("kpis") @RequirePermissions(Permissions.REPORTS_READ) getKpis(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.analyticsService.getKpis(user);
  }
  @Get("trends") @RequirePermissions(Permissions.REPORTS_READ) getTrends(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.analyticsService.getTrends(user);
  }
  @Post("manhours")
  @RequirePermissions(Permissions.REPORTS_READ)
  logManhours(
    @Body() dto: LogManhoursDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.analyticsService.logManhours(dto, user);
  }
}
