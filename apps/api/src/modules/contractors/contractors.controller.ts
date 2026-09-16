import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ContractorsService } from "./contractors.service";
import {
  CreateContractorDto,
  CreateContractorWorkerDto,
} from "./dto/contractor.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { Permissions } from "@kenzo-ehs/types";

@Controller("contractors")
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class ContractorsController {
  constructor(private readonly contractorsService: ContractorsService) {}
  @Get() @RequirePermissions(Permissions.CONTRACTOR_READ) getContractors(
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.contractorsService.getContractors(user);
  }
  @Post() @RequirePermissions(Permissions.CONTRACTOR_MANAGE) createContractor(
    @Body() dto: CreateContractorDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.contractorsService.createContractor(dto, user);
  }
  @Get(":id")
  @RequirePermissions(Permissions.CONTRACTOR_READ)
  getContractorById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.contractorsService.getContractorById(id, user);
  }
  @Get(":id/workers")
  @RequirePermissions(Permissions.CONTRACTOR_READ)
  getWorkers(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.contractorsService.getWorkers(id, user);
  }
  @Post(":id/workers")
  @RequirePermissions(Permissions.CONTRACTOR_MANAGE)
  addWorker(
    @Param("id") id: string,
    @Body() dto: CreateContractorWorkerDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.contractorsService.addWorker(id, dto, user);
  }
  @Patch("workers/:workerId/eligibility")
  @RequirePermissions(Permissions.CONTRACTOR_MANAGE)
  updateWorkerEligibility(
    @Param("workerId") workerId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.contractorsService.updateWorkerEligibility(workerId, dto, user);
  }
}
