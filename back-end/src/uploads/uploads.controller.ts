import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { VirusScannerService } from './virus-scanner.service';
import { StorageService } from './storage.service';

/**
 * Allowed MIME types and extensions for receipts, agency tax docs, and guide credentials.
 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly virusScanner: VirusScannerService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * POST /uploads/attachment
   *
   * Secure file upload with:
   * - Type/size validation (JPG, PNG, WebP, PDF up to 10MB)
   * - Virus scanning hook
   * - S3/MinIO compatible storage abstraction
   * - Cryptographically signed access URLs
   */
  @Post('attachment')
  @Roles(
    Role.TRAVELER,
    Role.GUIDE,
    Role.AGENCY,
    Role.ADMIN,
    Role.SUPERUSER,
    Role.SUPPORT,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a file (receipts, agency documents, guide proof — max 10MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload (JPG, PNG, WebP, PDF)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded and scanned successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or malicious file detected', type: ErrorResponseDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const mime = file.mimetype.toLowerCase();

        if (ALLOWED_EXTS.includes(ext) && ALLOWED_MIME_TYPES.includes(mime)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type. Allowed formats: ${ALLOWED_EXTS.join(', ')} (Received: ${ext || mime})`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file was provided. Attach a file under the "file" field.');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds 10MB limit (Size: ${(file.size / 1024 / 1024).toFixed(2)} MB).`);
    }

    // 1. Run Virus Scanner Hook
    await this.virusScanner.scanFile(file);

    // 2. Persist to storage (MinIO/S3 or disk fallback)
    const result = await this.storageService.saveFile(file);

    return result;
  }

  /**
   * GET /uploads/signed/:filename
   *
   * Validates signed URL token and expiration to securely stream or download the file.
   */
  @Get('signed/:filename')
  @ApiOperation({ summary: 'Access an uploaded document using a time-limited signed URL' })
  downloadSigned(
    @Param('filename') filename: string,
    @Query('token') token: string,
    @Query('expires') expires: string,
    @Res() res: Response,
  ) {
    if (!token || !expires) {
      throw new UnauthorizedException('Missing signed access token or expiry timestamp.');
    }

    const isValid = this.storageService.verifySignedUrl(filename, token, expires);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired document signed URL token.');
    }

    const filePath = this.storageService.getFilePath(filename);
    return res.sendFile(filePath);
  }
}
