import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDocumentDto, user: AuthenticatedUserContext) {
    return this.prisma.document.create({
      data: {
        organizationId: user.organizationId,
        plantId: dto.plantId ?? null,
        uploadedById: user.id,
        title: dto.title,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        storageKey: dto.storageKey,
        sha256Hash: dto.sha256Hash,
        classification: dto.classification,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
      },
    });
  }

  async findByEntity(
    entityType: string | undefined,
    entityId: string | undefined,
    user: AuthenticatedUserContext,
  ) {
    const where: any = {
      organizationId: user.organizationId,
      deletedAt: null,
    };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    return this.prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, user: AuthenticatedUserContext) {
    const doc = await this.prisma.document.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
      include: {
        uploadedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        versions: true,
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document [${id}] not found`);
    }

    return doc;
  }
}
