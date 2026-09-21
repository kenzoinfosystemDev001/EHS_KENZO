import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { SequenceAllocatorService } from "../../common/sequence/sequence-allocator.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { ActionItemStatus, ActionSourceType, CapaPriority } from "@prisma/client";

@Injectable()
export class ActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceAllocator: SequenceAllocatorService,
  ) {}

  async create(dto: any, user: AuthenticatedUserContext) {
    const year = new Date().getFullYear();
    const referenceNumber = await this.sequenceAllocator.nextReferenceNumber(
      user.organizationId,
      "ACTION",
      `ACT-${year}`,
    );

    return this.prisma.actionItem.create({
      data: {
        organizationId: user.organizationId,
        plantId: dto.plantId,
        referenceNumber,
        title: dto.title,
        description: dto.description,
        sourceType: dto.sourceType || ActionSourceType.MANAGEMENT_REVIEW,
        sourceEntityId: dto.sourceEntityId || null,
        status: ActionItemStatus.OPEN,
        priority: dto.priority || CapaPriority.MEDIUM,
        ownerId: dto.ownerId || user.id,
        verifierId: dto.verifierId || null,
        targetDate: new Date(dto.targetDate || Date.now() + 7 * 86400000),
      },
    });
  }

  async findAll(user: AuthenticatedUserContext) {
    return this.prisma.actionItem.findMany({
      where: { organizationId: user.organizationId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        verifier: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, user: AuthenticatedUserContext) {
    const action = await this.prisma.actionItem.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        verifier: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!action || action.organizationId !== user.organizationId) {
      throw new NotFoundException("Action not found");
    }
    return action;
  }

  async updateProgress(id: string, dto: any, user: AuthenticatedUserContext) {
    await this.findById(id, user);
    return this.prisma.actionItem.update({
      where: { id },
      data: {
        status: ActionItemStatus.IN_PROGRESS,
        completionNotes: dto.completionNotes || undefined,
        evidenceKey: dto.evidenceKey || undefined,
      },
    });
  }

  async submitVerification(id: string, user: AuthenticatedUserContext) {
    await this.findById(id, user);
    return this.prisma.actionItem.update({
      where: { id },
      data: {
        status: ActionItemStatus.PENDING_VERIFICATION,
        completedAt: new Date(),
      },
    });
  }

  async verify(id: string, user: AuthenticatedUserContext) {
    const action = await this.findById(id, user);
    if (action.ownerId === user.id) {
      throw new BadRequestException("Owner cannot verify their own action item");
    }
    return this.prisma.actionItem.update({
      where: { id },
      data: {
        status: ActionItemStatus.VERIFIED,
        verifierId: user.id,
        verifiedAt: new Date(),
      },
    });
  }

  async close(id: string, user: AuthenticatedUserContext) {
    await this.findById(id, user);
    return this.prisma.actionItem.update({
      where: { id },
      data: { status: ActionItemStatus.CLOSED },
    });
  }
}
