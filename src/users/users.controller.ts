import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { SubmitProfileDto } from './dto/submit-profile.dto';
import { ApplyWholesalerDto } from './dto/apply-wholesaler.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CloudinaryService } from '../cloudinary.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  @UseInterceptors(FilesInterceptor('files', 5))
  async submitProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitProfileDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // Upload files to Cloudinary
    const fileMap = new Map<string, string>();
    for (const file of files) {
      const folder = 'shophub/kyc';
      const url = await this.cloudinary.uploadImage(file, folder);
      fileMap.set(file.fieldname, url);
    }

    // Map uploaded files to DTO fields
    const profileData: SubmitProfileDto = {
      ...dto,
      nationalIdImage: fileMap.get('nationalIdImage') || dto.nationalIdImage,
      selfieImage: fileMap.get('selfieImage') || dto.selfieImage,
      proofOfAddress: fileMap.get('proofOfAddress') || dto.proofOfAddress,
    };

    return this.usersService.submitProfile(userId, profileData);
  }

  @Post('wholesaler/apply')
  @Roles('RETAILER')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 2))
  async applyWholesaler(
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyWholesalerDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // Upload business document
    const fileMap = new Map<string, string>();
    for (const file of files) {
      const folder = 'shophub/wholesaler-docs';
      const url = await this.cloudinary.uploadImage(file, folder);
      fileMap.set(file.fieldname, url);
    }

    const wholesalerData: ApplyWholesalerDto = {
      ...dto,
      businessDocUrl: fileMap.get('businessDocUrl') || dto.businessDocUrl,
    };

    return this.usersService.applyWholesaler(userId, wholesalerData);
  }
}
