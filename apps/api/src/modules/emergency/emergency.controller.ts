import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { EmergencyService } from "./emergency.service";
import { CreateDrillDto, CreateContactDto } from "./dto/emergency.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@Controller("emergency")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}
  @Get("drills") @RequirePermissions(Permissions.EMERGENCY_READ) getDrills(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.emergencyService.getDrills(user);
  }
  @Post("drills") @RequirePermissions(Permissions.EMERGENCY_MANAGE) logDrill(
    @Body() dto: CreateDrillDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.emergencyService.logDrill(dto, user);
  }
  @Get("contacts") @RequirePermissions(Permissions.EMERGENCY_READ) getContacts(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.emergencyService.getContacts(user);
  }
  @Post("contacts")
  @RequirePermissions(Permissions.EMERGENCY_MANAGE)
  createContact(
    @Body() dto: CreateContactDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.emergencyService.createContact(dto, user);
  }
}
