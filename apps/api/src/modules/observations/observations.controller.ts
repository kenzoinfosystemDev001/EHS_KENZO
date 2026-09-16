import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common";
import { ObservationsService } from "./observations.service";
import {
  CreateObservationDto,
  ReviewObservationDto,
} from "./dto/observation.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@Controller("observations")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) {}

  @Get()
  @RequirePermissions(Permissions.OBSERVATION_READ)
  findAll(@CurrentUser() user: AuthenticatedUserContext) {
    return this.observationsService.findAll(user);
  }

  @Post()
  @RequirePermissions(Permissions.OBSERVATION_CREATE)
  create(
    @Body() dto: CreateObservationDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.observationsService.create(dto, user);
  }

  @Get(":id")
  @RequirePermissions(Permissions.OBSERVATION_READ)
  findById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.observationsService.findById(id, user);
  }

  @Post(":id/actions/review")
  @RequirePermissions(Permissions.OBSERVATION_REVIEW)
  review(
    @Param("id") id: string,
    @Body() dto: ReviewObservationDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.observationsService.review(id, dto, user);
  }

  @Post(":id/actions/require-action")
  @RequirePermissions(Permissions.OBSERVATION_REVIEW)
  requireAction(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.observationsService.requireAction(id, user);
  }

  @Post(":id/actions/verify")
  @RequirePermissions(Permissions.OBSERVATION_REVIEW)
  verify(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.observationsService.verify(id, user);
  }

  @Post(":id/actions/close")
  @RequirePermissions(Permissions.OBSERVATION_REVIEW)
  close(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.observationsService.close(id, user);
  }
}
