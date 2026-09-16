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
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CapaService } from "./capa.service";
import { CreateCapaDto, CapaActionDto } from "./dto/capa.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@ApiTags("CAPA")
@Controller("capa")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
@ApiBearerAuth()
export class CapaController {
  constructor(private readonly capaService: CapaService) {}

  @Post()
  @RequirePermissions(Permissions.CAPA_CREATE)
  async create(
    @Body() dto: CreateCapaDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.capaService.create(dto, user);
  }

  @Get()
  @RequirePermissions(Permissions.CAPA_READ)
  @ApiOperation({ summary: "List CAPA records filtered by scope" })
  async findAll(
    @CurrentUser() user: AuthenticatedUserContext,
    @Query("plantId") plantId?: string,
  ) {
    return this.capaService.findAll(user, plantId);
  }

  @Get(":id")
  @RequirePermissions(Permissions.CAPA_READ)
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.capaService.findById(id, user);
  }

  @Post(":id/actions/assign")
  @RequirePermissions(Permissions.CAPA_ASSIGN)
  @HttpCode(HttpStatus.OK)
  async assign(
    @Param("id") id: string,
    @Body() dto: CapaActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.capaService.executeAction(id, "ASSIGN", user, dto);
  }

  @Post(":id/actions/start")
  @RequirePermissions(Permissions.CAPA_EXECUTE)
  @HttpCode(HttpStatus.OK)
  async start(
    @Param("id") id: string,
    @Body() dto: CapaActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.capaService.executeAction(id, "START", user, dto);
  }

  @Post(":id/actions/submit-verification")
  @RequirePermissions(Permissions.CAPA_EXECUTE)
  @HttpCode(HttpStatus.OK)
  async submitVerification(
    @Param("id") id: string,
    @Body() dto: CapaActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.capaService.executeAction(id, "SUBMIT_VERIFICATION", user, dto);
  }

  @Post(":id/actions/verify")
  @RequirePermissions(Permissions.CAPA_VERIFY)
  @HttpCode(HttpStatus.OK)
  async verify(
    @Param("id") id: string,
    @Body() dto: CapaActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.capaService.executeAction(id, "VERIFY", user, dto);
  }

  @Post(":id/actions/close")
  @RequirePermissions(Permissions.CAPA_CLOSE)
  @HttpCode(HttpStatus.OK)
  async close(
    @Param("id") id: string,
    @Body() dto: CapaActionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.capaService.executeAction(id, "CLOSE", user, dto);
  }
}
