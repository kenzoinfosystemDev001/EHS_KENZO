import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { WorkflowService } from "./workflow.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";

@ApiTags("Workflow")
@Controller("workflow")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get("tasks/my")
  @ApiOperation({
    summary: "Get workflow tasks assigned to current user or their roles",
  })
  async getMyTasks(@CurrentUser() user: AuthenticatedUserContext) {
    return this.workflowService.getTasksForUser(user);
  }

  @Get("tasks")
  @ApiOperation({ summary: "Get all active workflow tasks in organization" })
  async getAllTasks(@CurrentUser() user: AuthenticatedUserContext) {
    return this.workflowService.getAllActiveTasks(user.organizationId);
  }
}
