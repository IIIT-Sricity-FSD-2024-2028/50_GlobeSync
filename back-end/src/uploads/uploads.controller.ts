import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

/**
 * Destination directory for uploaded files at runtime.
 * Resolved relative to the compiled dist/ output:
 *   dist/uploads/uploads.controller.js → ../../.. → back-end/uploads/
 */
const UPLOAD_DEST = join(__dirname, '..', '..', 'uploads');

/**
 * Allowed MIME extensions. Reject anything else at the multer layer
 * so the file is never written to disk before the check runs.
 */
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.pdf'];

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  /**
   * POST /uploads/attachment
   *
   * Upload a single file attachment (JPG, PNG, or PDF, max 5 MB).
   * Accessible by any authenticated role; the x-user-role header must
   * be present and valid (enforced by RolesGuard).
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
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a file attachment (JPG, PNG, PDF — max 5 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Attachment file (JPG, PNG, or PDF, max 5 MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      example: {
        message: 'File uploaded successfully',
        filename: '1722345678900-123456789.pdf',
        path: '/uploads/1722345678900-123456789.pdf',
        size: 204800,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'No file provided or invalid file type/size', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — missing or invalid x-user-role header', type: ErrorResponseDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DEST,
        filename: (_req, file, cb) => {
          // Collision-resistant name: timestamp + random 9-digit suffix + original extension.
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB hard cap
      },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTS.includes(ext)) {
          cb(null, true);
        } else {
          // Passing an error here causes multer to abort and the interceptor
          // surfaces it as a BadRequestException through the global filter.
          cb(new BadRequestException('Only JPG, PNG, and PDF files are allowed'), false);
        }
      },
    }),
  )
  uploadAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file was provided. Attach a file under the "file" field.');
    }

    return {
      message: 'File uploaded successfully',
      filename: file.filename,
      path: `/uploads/${file.filename}`,
      size: file.size,
    };
  }
}
