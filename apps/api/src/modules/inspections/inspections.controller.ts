import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common";
import { InspectionsService } from "./inspections.service";
import { CreateTemplateDto, ExecuteInspectionDto } from "./dto/inspection.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@Controller("inspections")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get()
  @RequirePermissions(Permissions.INSPECTION_READ)
  findAll(@CurrentUser() user: AuthenticatedUserContext) {
    return this.inspectionsService.getExecutions(user);
  }

  @Post()
  @RequirePermissions(Permissions.INSPECTION_CREATE)
  create(
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.inspectionsService.executeInspection(dto, user);
  }

  @Get("templates")
  @RequirePermissions(Permissions.INSPECTION_READ)
  getTemplates(@CurrentUser() user: AuthenticatedUserContext) {
    return this.inspectionsService.getTemplates(user);
  }
  @Post("templates")
  @RequirePermissions(Permissions.INSPECTION_CREATE)
  createTemplate(
    @Body() dto: CreateTemplateDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.inspectionsService.createTemplate(dto, user);
  }
  @Get("executions")
  @RequirePermissions(Permissions.INSPECTION_READ)
  getExecutions(@CurrentUser() user: AuthenticatedUserContext) {
    return this.inspectionsService.getExecutions(user);
  }
  @Post("executions")
  @RequirePermissions(Permissions.INSPECTION_CREATE)
  executeInspection(
    @Body() dto: ExecuteInspectionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.inspectionsService.executeInspection(dto, user);
  }
  @Get("executions/:id")
  @RequirePermissions(Permissions.INSPECTION_READ)
  getExecutionById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.inspectionsService.getExecutionById(id, user);
  }
}
