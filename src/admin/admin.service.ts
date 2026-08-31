import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateWholesalerStatusDto } from './dto/update-wholesaler-status.dto';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getPendingProfiles(page = 1, limit = 20) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { status: 'PENDING_VERIFICATION' },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          nationalIdNumber: true,
          nationalIdImage: true,
          selfieImage: true,
          addressDistrict: true,
          addressSector: true,
          addressCell: true,
          addressVillage: true,
          proofOfAddress: true,
          profileSubmittedAt: true,
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { profileSubmittedAt: 'asc' },
      }),
      this.prisma.user.count({ where: { status: 'PENDING_VERIFICATION' } }),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPendingWholesalers(page = 1, limit = 20) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { wholesalerStatus: 'PENDING' },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          businessName: true,
          tin: true,
          businessRegNo: true,
          businessAddress: true,
          businessCategory: true,
          businessDocUrl: true,
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.count({ where: { wholesalerStatus: 'PENDING' } }),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Validate status transitions
    const validTransitions: Record<UserStatus, UserStatus[]> = {
      PENDING_EMAIL_VERIFICATION: ['ACTIVE', 'SUSPENDED', 'DELETED'],
      PENDING_PHONE_VERIFICATION: ['ACTIVE', 'SUSPENDED', 'DELETED'],
      PENDING_PROFILE: ['PENDING_VERIFICATION', 'SUSPENDED', 'DELETED'],
      PENDING_VERIFICATION: ['ACTIVE', 'REJECTED', 'SUSPENDED', 'DELETED'],
      ACTIVE: ['SUSPENDED', 'DELETED'],
      SUSPENDED: ['ACTIVE', 'DELETED'],
      REJECTED: ['PENDING_VERIFICATION', 'DELETED'],
      DELETED: [],
    };

    if (!validTransitions[user.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${user.status} to ${dto.status}`,
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
    });

    return {
      message: `User status updated to ${dto.status}`,
      user: updatedUser,
    };
  }

  async updateWholesalerStatus(userId: string, dto: UpdateWholesalerStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.wholesalerStatus !== 'PENDING' && dto.status !== 'REJECTED') {
      throw new BadRequestException(
        'Can only update status for pending applications',
      );
    }

    const newRole = dto.status === 'APPROVED' ? 'WHOLESALER' : 'RETAILER';

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        wholesalerStatus: dto.status,
        role: newRole,
      },
    });

    return {
      message: `Wholesaler application ${dto.status.toLowerCase()}`,
      user: updatedUser,
    };
  }

  async getAllUsers(page = 1, limit = 20, status?: UserStatus) {
    const where = status ? { status } : {};
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
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
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
