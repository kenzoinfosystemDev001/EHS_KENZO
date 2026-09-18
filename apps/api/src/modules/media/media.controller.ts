import { Controller, Post, Body, UseGuards, BadRequestException } from "@nestjs/common";
import { CloudinaryService } from "./cloudinary.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller("media")
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post("upload")
  async upload(@Body() body: { dataUri?: string; image?: string; file?: string }) {
    const rawImage = body.dataUri || body.image || body.file;
    if (!rawImage) {
      throw new BadRequestException("Image data (dataUri) is required");
    }

    const result = await this.cloudinaryService.uploadImage(rawImage);
    return {
      success: true,
      url: result.url,
      publicId: result.publicId,
      format: result.format,
    };
  }
}
