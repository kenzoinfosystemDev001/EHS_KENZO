import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ComplianceService } from "./compliance.service";
import {
  CreateObligationDto,
  UpdateComplianceStatusDto,
} from "./dto/compliance.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@Controller("compliance")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}
  @Get() @RequirePermissions(Permissions.COMPLIANCE_READ) getObligations(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.complianceService.getObligations(user);
  }
  @Post() @RequirePermissions(Permissions.COMPLIANCE_MANAGE) createObligation(
    @Body() dto: CreateObligationDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.complianceService.createObligation(dto, user);
  }
  @Patch(":id/status")
  @RequirePermissions(Permissions.COMPLIANCE_MANAGE)
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateComplianceStatusDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.complianceService.updateStatus(id, dto, user);
  }
  @Get("summary") @RequirePermissions(Permissions.COMPLIANCE_READ) getSummary(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.complianceService.getSummary(user);
  }
}
