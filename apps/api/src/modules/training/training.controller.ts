import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { TrainingService } from "./training.service";
import {
  CreateCourseDto,
  CreateSessionDto,
  RecordTrainingDto,
} from "./dto/training.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@Controller("training")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get()
  @RequirePermissions(Permissions.TRAINING_READ)
  findAll(@CurrentUser() user: AuthenticatedUserContext) {
    return this.trainingService.getCourses(user);
  }

  @Post()
  @RequirePermissions(Permissions.TRAINING_MANAGE)
  create(
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.trainingService.createCourse(dto, user);
  }

  @Get("courses") @RequirePermissions(Permissions.TRAINING_READ) getCourses(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.trainingService.getCourses(user);
  }
  @Post("courses")
  @RequirePermissions(Permissions.TRAINING_MANAGE)
  createCourse(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.trainingService.createCourse(dto, user);
  }
  @Get("sessions") @RequirePermissions(Permissions.TRAINING_READ) getSessions(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.trainingService.getSessions(user);
  }
  @Post("sessions")
  @RequirePermissions(Permissions.TRAINING_MANAGE)
  createSession(
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.trainingService.createSession(dto, user);
  }
  @Get("records") @RequirePermissions(Permissions.TRAINING_READ) getRecords(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.trainingService.getRecords(user);
  }
  @Post("records")
  @RequirePermissions(Permissions.TRAINING_MANAGE)
  recordTraining(
    @Body() dto: RecordTrainingDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.trainingService.recordTraining(dto, user);
  }
  @Get("matrix") @RequirePermissions(Permissions.TRAINING_READ) getMatrix(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.trainingService.getMatrix(user);
  }
  @Get("check-eligibility")
  @RequirePermissions(Permissions.TRAINING_READ)
  checkEligibility(@CurrentUser() user: AuthenticatedUserContext) {
    return this.trainingService.checkEligibility(user.id);
  }
}
