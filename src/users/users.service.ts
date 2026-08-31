import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitProfileDto } from './dto/submit-profile.dto';
import { ApplyWholesalerDto } from './dto/apply-wholesaler.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async submitProfile(userId: string, dto: SubmitProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (
      user.status !== 'PENDING_PROFILE' &&
      user.status !== 'PENDING_VERIFICATION'
    ) {
      throw new BadRequestException(
        'Profile can only be submitted in PENDING_PROFILE or PENDING_VERIFICATION status',
      );
    }

    // Check if national ID is already used by another user
    const existingNationalId = await this.prisma.user.findFirst({
      where: {
        nationalIdNumber: dto.nationalIdNumber,
        NOT: { id: userId },
      },
    });
    if (existingNationalId) {
      throw new BadRequestException('National ID already registered');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        nationalIdNumber: dto.nationalIdNumber,
        nationalIdImage: dto.nationalIdImage,
        selfieImage: dto.selfieImage,
        addressDistrict: dto.addressDistrict,
        addressSector: dto.addressSector,
        addressCell: dto.addressCell,
        addressVillage: dto.addressVillage,
        proofOfAddress: dto.proofOfAddress,
        profileSubmittedAt: new Date(),
        status: 'PENDING_VERIFICATION',
      },
    });

    return {
      message: 'Profile submitted successfully. Awaiting admin verification.',
    };
  }

  async applyWholesaler(userId: string, dto: ApplyWholesalerDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role !== 'RETAILER') {
      throw new ForbiddenException(
        'Only retailers can apply for wholesaler status',
      );
    }

    if (user.wholesalerStatus !== 'NOT_APPLIED') {
      throw new BadRequestException('Wholesaler application already exists');
    }

    // Check if TIN is already used
    const existingTin = await this.prisma.user.findFirst({
      where: { tin: dto.tin, NOT: { id: userId } },
    });
    if (existingTin) {
      throw new BadRequestException('TIN already registered');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        businessName: dto.businessName,
        tin: dto.tin,
        businessRegNo: dto.businessRegNo,
        businessAddress: dto.businessAddress,
        businessCategory: dto.businessCategory,
        businessDocUrl: dto.businessDocUrl,
        wholesalerStatus: 'PENDING',
      },
    });

    return {
      message:
        'Wholesaler application submitted successfully. Awaiting admin approval.',
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        role: true,
        wholesalerStatus: true,
        nationalIdNumber: true,
        nationalIdImage: true,
        selfieImage: true,
        addressDistrict: true,
        addressSector: true,
        addressCell: true,
        addressVillage: true,
        proofOfAddress: true,
        businessName: true,
        tin: true,
        businessRegNo: true,
        businessAddress: true,
        businessCategory: true,
        businessDocUrl: true,
        profileSubmittedAt: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
