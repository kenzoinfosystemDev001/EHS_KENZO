import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { MasterDataService } from "./master-data.service";
import { CreatePlantDto } from "./dto/master-data.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@ApiTags("Plants")
@Controller("plants")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PlantsController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get()
  @ApiOperation({ summary: "List plants within user organization" })
  async findAll(@CurrentUser() user: AuthenticatedUserContext) {
    return this.masterDataService.getPlants(user);
  }

  @Post()
  @RequirePermissions(Permissions.PLANT_MANAGE)
  @ApiOperation({ summary: "Create new plant/site" })
  async create(
    @Body() dto: CreatePlantDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.masterDataService.createPlant(dto, user);
  }
}
