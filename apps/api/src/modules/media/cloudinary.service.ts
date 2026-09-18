import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    const cloudName = process.env.CLOUD_NAME || "rhyn1n8t";
    const apiKey = process.env.CLOUD_API_KEY || "992153128996766";
    const apiSecret = process.env.CLOUD_API_SECRET || "uGxlbUO8dq0QTPpSYwF3SbNirRQ";

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    this.logger.log(`Cloudinary configured for cloud_name: ${cloudName}`);
  }

  /**
   * Validate that the image data or MIME type is strictly JPG or PNG
   */
  validateFormat(dataUriOrMime: string) {
    if (!dataUriOrMime) return;

    // Check data URI header, e.g. data:image/png;base64,... or data:image/jpeg;base64,...
    const match = dataUriOrMime.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    if (match) {
      const mime = match[1].toLowerCase();
      if (mime !== "image/jpeg" && mime !== "image/jpg" && mime !== "image/png") {
        throw new BadRequestException(
          `Invalid file format [${mime}]. ONLY JPG and PNG image formats are supported.`
        );
      }
      return;
    }

    // Check if filename / extension
    const ext = dataUriOrMime.split(".").pop()?.toLowerCase();
    if (ext && ["jpg", "jpeg", "png"].includes(ext)) {
      return;
    }

    // If it's a URL or direct base64, check signature if base64
    if (dataUriOrMime.startsWith("/9j/")) {
      // JPEG magic number in base64
      return;
    }
    if (dataUriOrMime.startsWith("iVBORw0KGgo")) {
      // PNG magic number in base64
      return;
    }

    // If already a valid HTTPS URL
    if (dataUriOrMime.startsWith("http://") || dataUriOrMime.startsWith("https://")) {
      return;
    }

    throw new BadRequestException("ONLY JPG and PNG image formats are supported.");
  }

  /**
   * Upload image (base64 data URI or buffer) to Cloudinary
   */
  async uploadImage(
    dataUri: string,
    folder: string = "kenzo-ehs/observations"
  ): Promise<{ url: string; publicId: string; format: string }> {
    if (!dataUri) {
      throw new BadRequestException("Image data is required");
    }

    // If already hosted on Cloudinary or external HTTPS, return directly
    if (dataUri.startsWith("http://") || dataUri.startsWith("https://")) {
      return { url: dataUri, publicId: "", format: "jpg" };
    }

    this.validateFormat(dataUri);

    try {
      const uploadResult: UploadApiResponse = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png"],
      });

      this.logger.log(`Uploaded image to Cloudinary: ${uploadResult.secure_url}`);
      return {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        format: uploadResult.format,
      };
    } catch (error: any) {
      this.logger.error(`Cloudinary upload failed: ${error.message}`, error.stack);
      // If error is format rejection from Cloudinary
      if (error.message && error.message.includes("format")) {
        throw new BadRequestException("ONLY JPG and PNG image formats are supported.");
      }
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }
  }
}
