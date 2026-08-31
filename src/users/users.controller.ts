import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { SubmitProfileDto } from './dto/submit-profile.dto';
import { ApplyWholesalerDto } from './dto/apply-wholesaler.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CloudinaryService } from '../cloudinary.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get('profile')
  @Roles('RETAILER', 'WHOLESALER', 'ADMIN')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Post('profile')
  @Roles('RETAILER', 'WHOLESALER')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Submit KYC profile with file uploads',
    description:
      'Upload nationalIdImage, selfieImage, and proofOfAddress as multipart/form-data files. ' +
      'Do not send URL strings - the endpoint accepts file uploads and returns Cloudinary URLs.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nationalIdNumber: {
          type: 'string',
          pattern: '^\\d{16}$',
          description: '16-digit national ID number',
        },
        addressDistrict: { type: 'string', maxLength: 100 },
        addressSector: { type: 'string', maxLength: 100 },
        addressCell: { type: 'string', maxLength: 100 },
        addressVillage: { type: 'string', maxLength: 100 },
        nationalIdImage: {
          type: 'string',
          format: 'binary',
          description: 'National ID image file (JPG/PNG)',
        },
        selfieImage: {
          type: 'string',
          format: 'binary',
          description: 'Selfie image file (JPG/PNG)',
        },
        proofOfAddress: {
          type: 'string',
          format: 'binary',
          description: 'Proof of address document (JPG/PNG/PDF)',
        },
      },
      required: [
        'nationalIdNumber',
        'addressDistrict',
        'addressSector',
        'addressCell',
        'addressVillage',
        'nationalIdImage',
        'selfieImage',
        'proofOfAddress',
      ],
    },
  })
  @ApiResponse({ status: 201, description: 'Profile submitted successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or missing files' })
  @UseInterceptors(FilesInterceptor('files', 5))
  async submitProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<SubmitProfileDto>,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // Validate required files are present
    const fileFields = ['nationalIdImage', 'selfieImage', 'proofOfAddress'];
    const missingFiles = fileFields.filter(
      (field) => !files.some((f) => f.fieldname === field),
    );

    if (missingFiles.length > 0) {
      throw new BadRequestException(
        `Missing required files: ${missingFiles.join(', ')}`,
      );
    }

    // Upload files to Cloudinary
    const fileMap = new Map<string, string>();
    for (const file of files) {
      const folder = 'shophub/kyc';
      const url = await this.cloudinary.uploadImage(file, folder);
      fileMap.set(file.fieldname, url);
    }

    // Create complete profile data with uploaded file URLs
    const profileData: SubmitProfileDto = {
      nationalIdNumber: dto.nationalIdNumber!,
      addressDistrict: dto.addressDistrict!,
      addressSector: dto.addressSector!,
      addressCell: dto.addressCell!,
      addressVillage: dto.addressVillage!,
      nationalIdImage: fileMap.get('nationalIdImage')!,
      selfieImage: fileMap.get('selfieImage')!,
      proofOfAddress: fileMap.get('proofOfAddress')!,
    };

    return this.usersService.submitProfile(userId, profileData);
  }

  @Post('wholesaler/apply')
  @Roles('RETAILER')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Apply for wholesaler status with business document upload',
    description:
      'Upload businessDocUrl as multipart/form-data file. ' +
      'Do not send URL strings - the endpoint accepts file upload and returns Cloudinary URL.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        businessName: { type: 'string', maxLength: 200 },
        tin: { type: 'string', description: 'Tax Identification Number' },
        businessRegNo: { type: 'string', description: 'Business Registration Number' },
        businessAddress: { type: 'string', maxLength: 500 },
        businessCategory: { type: 'string', maxLength: 100 },
        businessDocUrl: {
          type: 'string',
          format: 'binary',
          description: 'Business document file (PDF/JPG/PNG)',
        },
      },
      required: [
        'businessName',
        'tin',
        'businessRegNo',
        'businessAddress',
        'businessCategory',
        'businessDocUrl',
      ],
    },
  })
  @ApiResponse({ status: 201, description: 'Wholesaler application submitted' })
  @ApiResponse({ status: 400, description: 'Validation error or missing file' })
  @UseInterceptors(FilesInterceptor('files', 2))
  async applyWholesaler(
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<ApplyWholesalerDto>,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // Validate required file is present
    const businessDoc = files.find((f) => f.fieldname === 'businessDocUrl');
    if (!businessDoc) {
      throw new BadRequestException('Missing required file: businessDocUrl');
    }

    // Upload business document
    const fileMap = new Map<string, string>();
    for (const file of files) {
      const folder = 'shophub/wholesaler-docs';
      const url = await this.cloudinary.uploadImage(file, folder);
      fileMap.set(file.fieldname, url);
    }

    const wholesalerData: ApplyWholesalerDto = {
      businessName: dto.businessName!,
      tin: dto.tin!,
      businessRegNo: dto.businessRegNo!,
      businessAddress: dto.businessAddress!,
      businessCategory: dto.businessCategory!,
      businessDocUrl: fileMap.get('businessDocUrl')!,
    };

    return this.usersService.applyWholesaler(userId, wholesalerData);
  }
}
