import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common";
import { LotoService } from "./loto.service";
import { CreateLotoEquipmentDto, ApplyIsolationDto } from "./dto/loto.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@Controller("loto")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class LotoController {
  constructor(private readonly lotoService: LotoService) {}
  @Get("equipment") @RequirePermissions(Permissions.PTW_READ) getEquipment(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.lotoService.getEquipment(user);
  }
  @Post("equipment")
  @RequirePermissions(Permissions.LOTO_APPLY)
  createEquipment(
    @Body() dto: CreateLotoEquipmentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.lotoService.createEquipment(dto, user);
  }
  @Get("isolations") @RequirePermissions(Permissions.PTW_READ) getIsolations(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.lotoService.getIsolations(user);
  }
  @Post("isolations")
  @RequirePermissions(Permissions.LOTO_APPLY)
  applyIsolation(
    @Body() dto: ApplyIsolationDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.lotoService.applyIsolation(dto, user);
  }
  @Post("isolations/:id/actions/verify")
  @RequirePermissions(Permissions.LOTO_APPLY)
  verifyIsolation(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.lotoService.verifyIsolation(id, user);
  }
  @Post("isolations/:id/actions/release")
  @RequirePermissions(Permissions.LOTO_APPLY)
  releaseIsolation(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.lotoService.releaseIsolation(id, user);
  }
}
