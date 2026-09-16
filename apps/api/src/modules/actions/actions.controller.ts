import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ActionsService } from "./actions.service";
import {
  CreateActionDto,
  UpdateActionDto,
  } from "./dto/action.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@Controller("actions")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get()
  @RequirePermissions(Permissions.ACTION_READ)
  findAll(@CurrentUser() user: AuthenticatedUserContext) {
    return this.actionsService.findAll(user);
  }

  @Post()
  @RequirePermissions(Permissions.ACTION_CREATE)
  create(
    @Body() dto: CreateActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.actionsService.create(dto, user);
  }

  @Get(":id")
  @RequirePermissions(Permissions.ACTION_READ)
  findById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.actionsService.findById(id, user);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.ACTION_UPDATE)
  updateProgress(
    @Param("id") id: string,
    @Body() dto: UpdateActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.actionsService.updateProgress(id, dto, user);
  }

  @Post(":id/actions/submit-verification")
  @RequirePermissions(Permissions.ACTION_UPDATE)
  submitVerification(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.actionsService.submitVerification(id, user);
  }

  @Post(":id/actions/verify")
  @RequirePermissions(Permissions.ACTION_UPDATE)
  verify(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.actionsService.verify(id, user);
  }

  @Post(":id/actions/close")
  @RequirePermissions(Permissions.ACTION_UPDATE)
  close(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.actionsService.close(id, user);
  }
}
