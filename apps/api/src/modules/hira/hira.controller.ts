import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { HiraService } from "./hira.service";
import { CreateHiraStudyDto } from "./dto/create-hira-study.dto";
import { AddActivityDto } from "./dto/add-activity.dto";
import { AddHazardDto } from "./dto/add-hazard.dto";
import { HiraActionDto } from "./dto/hira-action.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@ApiTags("HIRA")
@Controller("hira")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
@ApiBearerAuth()
export class HiraController {
  constructor(private readonly hiraService: HiraService) {}

  @Post()
  @RequirePermissions(Permissions.HIRA_CREATE)
  @ApiOperation({ summary: "Create a new HIRA study" })
  async create(
    @Body() dto: CreateHiraStudyDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.hiraService.createStudy(dto, user);
  }

  @Get()
  @RequirePermissions(Permissions.HIRA_READ)
  @ApiOperation({ summary: "List HIRA studies filtered by scope and plant" })
  @ApiQuery({ name: "plantId", required: false, type: String })
  async findAll(
    @CurrentUser() user: AuthenticatedUserContext,
    @Query("plantId") plantId?: string,
  ) {
    return this.hiraService.findAll(user, plantId);
  }

  @Get(":id")
  @RequirePermissions(Permissions.HIRA_READ)
  @ApiOperation({ summary: "Get complete HIRA study details" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.hiraService.findById(id, user);
  }

  @Post(":id/activities")
  @RequirePermissions(Permissions.HIRA_UPDATE)
  @ApiOperation({ summary: "Add an operational activity to a HIRA study" })
  async addActivity(
    @Param("id") id: string,
    @Body() dto: AddActivityDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.hiraService.addActivity(id, dto, user);
  }

  @Post(":id/activities/:activityId/hazards")
  @RequirePermissions(Permissions.HIRA_UPDATE)
  @ApiOperation({
    summary:
      "Identify hazard, controls, and compute server-side risk assessment",
  })
  async addHazard(
    @Param("id") id: string,
    @Param("activityId") activityId: string,
    @Body() dto: AddHazardDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.hiraService.addHazard(id, activityId, dto, user);
  }

  @Post(":id/actions/submit")
  @RequirePermissions(Permissions.HIRA_SUBMIT)
  @ApiOperation({
    summary: "Explicit Action: Submit HIRA study for team review",
  })
  async submit(
    @Param("id") id: string,
    @Body() dto: HiraActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.hiraService.submitStudy(id, user, dto);
  }

  @Post(":id/actions/review")
  @RequirePermissions(Permissions.HIRA_REVIEW)
  @ApiOperation({
    summary: "Explicit Action: Recommend for approval or request rework",
  })
  async review(
    @Param("id") id: string,
    @Body() dto: HiraActionDto,
    @Query("decision") decision: "RECOMMEND" | "REQUEST_REWORK" = "RECOMMEND",
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.hiraService.reviewStudy(id, user, dto, decision);
  }

  @Post(":id/actions/approve")
  @RequirePermissions(Permissions.HIRA_APPROVE)
  @ApiOperation({ summary: "Explicit Action: Formal approval of HIRA study" })
  async approve(
    @Param("id") id: string,
    @Body() dto: HiraActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.hiraService.approveStudy(id, user, dto);
  }

  @Post(":id/actions/reject")
  @RequirePermissions(Permissions.HIRA_APPROVE)
  @ApiOperation({
    summary: "Explicit Action: Reject HIRA study back to IN_PROGRESS",
  })
  async reject(
    @Param("id") id: string,
    @Body() dto: HiraActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.hiraService.rejectStudy(id, user, dto);
  }

  @Post(":id/actions/activate")
  @RequirePermissions(Permissions.HIRA_ACTIVATE)
  @ApiOperation({
    summary:
      "Explicit Action: Activate approved HIRA study for site operations",
  })
  async activate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.hiraService.activateStudy(id, user);
  }
}
