import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { IncidentService } from "./incident.service";
import { CreateIncidentDto } from "./dto/create-incident.dto";
import { IncidentActionDto } from "./dto/incident-action.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@ApiTags("Incidents")
@Controller("incidents")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
@ApiBearerAuth()
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post()
  @RequirePermissions(Permissions.INCIDENT_CREATE)
  @ApiOperation({ summary: "Report a new incident" })
  async create(
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.incidentService.create(dto, user);
  }

  @Get()
  @RequirePermissions(Permissions.INCIDENT_READ)
  @ApiQuery({ name: "plantId", required: false })
  @ApiOperation({ summary: "List incidents filtered by scope" })
  async findAll(
    @CurrentUser() user: AuthenticatedUserContext,
    @Query("plantId") plantId?: string,
  ) {
    return this.incidentService.findAll(user, plantId);
  }

  @Get(":id")
  @RequirePermissions(Permissions.INCIDENT_READ)
  @ApiOperation({ summary: "Get incident details" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.incidentService.findById(id, user);
  }

  @Post(":id/actions/report")
  @RequirePermissions(Permissions.INCIDENT_CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Action: Formally report a draft incident" })
  async report(
    @Param("id") id: string,
    @Body() dto: IncidentActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.incidentService.executeAction(id, "REPORT", user, dto);
  }

  @Post(":id/actions/classify")
  @RequirePermissions(Permissions.INCIDENT_CLASSIFY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Action: Classify severity and type of incident" })
  async classify(
    @Param("id") id: string,
    @Body() dto: IncidentActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.incidentService.executeAction(id, "CLASSIFY", user, dto);
  }

  @Post(":id/actions/investigate")
  @RequirePermissions(Permissions.INCIDENT_INVESTIGATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Action: Start formal investigation" })
  async investigate(
    @Param("id") id: string,
    @Body() dto: IncidentActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.incidentService.executeAction(
      id,
      "START_INVESTIGATION",
      user,
      dto,
    );
  }

  @Post(":id/actions/initiate-rca")
  @RequirePermissions(Permissions.RCA_CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Action: Initiate Root Cause Analysis" })
  async initiateRca(
    @Param("id") id: string,
    @Body() dto: IncidentActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.incidentService.executeAction(id, "INITIATE_RCA", user, dto);
  }

  @Post(":id/actions/request-closure")
  @RequirePermissions(Permissions.INCIDENT_CLOSE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Action: Request closure after CAPA completion" })
  async requestClosure(
    @Param("id") id: string,
    @Body() dto: IncidentActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.incidentService.executeAction(id, "REQUEST_CLOSURE", user, dto);
  }

  @Post(":id/actions/close")
  @RequirePermissions(Permissions.INCIDENT_APPROVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Action: Final approval and closure of incident" })
  async close(
    @Param("id") id: string,
    @Body() dto: IncidentActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.incidentService.executeAction(id, "APPROVE_CLOSURE", user, dto);
  }
}
