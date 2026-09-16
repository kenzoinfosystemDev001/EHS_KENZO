import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common";
import { AuditsService } from "./audits.service";
import { CreateAuditPlanDto, AddAuditFindingDto } from "./dto/audit.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@Controller("audits")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}
  @Get() @RequirePermissions(Permissions.AUDIT_READ) getPlans(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.auditsService.getPlans(user);
  }
  @Post() @RequirePermissions(Permissions.AUDIT_PERFORM) createPlan(
    @Body() dto: CreateAuditPlanDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.auditsService.createPlan(dto, user);
  }
  @Get(":id") @RequirePermissions(Permissions.AUDIT_READ) getPlanById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.auditsService.getPlanById(id, user);
  }
  @Post(":id/findings")
  @RequirePermissions(Permissions.AUDIT_PERFORM)
  addFinding(
    @Param("id") id: string,
    @Body() dto: AddAuditFindingDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.auditsService.addFinding(id, dto, user);
  }
  @Post(":id/actions/complete")
  @RequirePermissions(Permissions.AUDIT_PERFORM)
  completePlan(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.auditsService.completePlan(id, user);
  }
  @Post(":id/actions/close")
  @RequirePermissions(Permissions.AUDIT_PERFORM)
  closePlan(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.auditsService.closePlan(id, user);
  }
}
