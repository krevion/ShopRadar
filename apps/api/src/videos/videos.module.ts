import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Post,
  Req,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { execFile } from 'child_process';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { unlink } from 'fs/promises';
import ffprobeStatic = require('ffprobe-static');
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { apiConfig } from '../config/env';
import { PrismaService } from '../common/prisma.service';

const MAX_VIDEO_SECONDS = 150;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const uploadDirectory = join(process.cwd(), 'uploads', 'videos');
const execFileAsync = promisify(execFile);

class CreateVideoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category!: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  duration!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description = '';

  @IsString()
  @IsOptional()
  seller?: string;
}

class CreateVideoCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body!: string;
}

type VideoInput = {
  title: string;
  category: string;
  description: string;
};

type SellerAccess = {
  eligible: boolean;
  reason: string;
  sellerName?: string;
};

@Injectable()
class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSellerAccess(user: AuthenticatedUser): Promise<SellerAccess> {
    if (user.role !== 'SELLER') {
      return { eligible: false, reason: 'Use a seller account to publish videos.' };
    }

    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException('Seller registration and payment status cannot be verified right now.');
    }

    const now = new Date();
    const paidSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const account = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        active: true,
        role: true,
        sellerProfile: {
          select: {
            id: true,
            shopName: true
          }
        },
        payments: {
          where: {
            orderId: null,
            provider: 'mpesa',
            status: 'SUCCESSFUL',
            amount: { gte: 1000 },
            createdAt: { gte: paidSince }
          },
          select: { id: true },
          take: 1
        }
      }
    });

    if (!account?.active || account.role !== 'SELLER') {
      return { eligible: false, reason: 'This seller account is not active.' };
    }
    if (!account.sellerProfile) {
      return { eligible: false, reason: 'Register your seller profile before uploading videos.' };
    }
    if (account.payments.length === 0) {
      return { eligible: false, reason: 'A successful KSh 1,000 subscription payment from the last 30 days is required.' };
    }

    return { eligible: true, reason: 'Seller access is active.', sellerName: account.sellerProfile.shopName };
  }

  async requireSellerAccess(user: AuthenticatedUser) {
    const access = await this.getSellerAccess(user);
    if (!access.eligible) {
      throw new ForbiddenException(access.reason);
    }
    return access;
  }

  async findAll() {
    if (!this.prisma.databaseAvailable) {
      return [];
    }

    const videos = await this.prisma.video.findMany({
      include: { sellerProfile: { select: { shopName: true, isVerified: true, bio: true, shop: { select: { city: true } } } } },
      orderBy: { createdAt: 'desc' }
    });

    return videos.map((video) => ({
      ...video,
      videoUrl: video.videoUrl.startsWith('/uploads/')
        ? `${apiConfig.publicUrl}${video.videoUrl}`
        : video.videoUrl,
      seller: video.sellerProfile.shopName,
      sellerVerified: video.sellerProfile.isVerified,
      sellerBio: video.sellerProfile.bio,
      sellerCity: video.sellerProfile.shop?.city
    }));
  }

  async create(user: AuthenticatedUser, input: VideoInput, uploadedUrl: string, filePath: string) {
    try {
      const access = await this.requireSellerAccess(user);
      let stdout: string;
      try {
        ({ stdout } = await execFileAsync(ffprobeStatic.path, [
          '-v', 'error',
          '-select_streams', 'v:0',
          '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          filePath
        ], { timeout: 15000, windowsHide: true, maxBuffer: 1024, encoding: 'utf8' }));
      } catch (error) {
        this.logger.warn(`Video metadata probe failed: ${error instanceof Error ? error.message : String(error)}`);
        throw new BadRequestException('The uploaded file is not a readable video.');
      }
      const durationSeconds = Number(stdout.trim());
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > MAX_VIDEO_SECONDS) {
        throw new BadRequestException('Video length must be between 1 second and 2 minutes 30 seconds.');
      }

      const profile = await this.prisma.sellerProfile.findUnique({
        where: { userId: user.sub },
        select: { id: true, isVerified: true }
      });
      if (!profile) {
        throw new ForbiddenException('A registered seller profile is required.');
      }

      const created = await this.prisma.video.create({
        data: {
          sellerProfileId: profile.id,
          title: input.title.trim(),
          category: input.category.trim(),
          duration: durationSeconds < 60
            ? `${Math.ceil(durationSeconds)}s`
            : `${Math.floor(durationSeconds / 60)}:${String(Math.ceil(durationSeconds % 60)).padStart(2, '0')}`,
          durationSeconds: Math.ceil(durationSeconds),
          description: input.description.trim() || 'A seller video.',
          videoUrl: uploadedUrl
        }
      });
      return { ...created, seller: access.sellerName, sellerVerified: profile.isVerified };
    } catch (error) {
      await this.removeUpload(filePath);
      throw error;
    }
  }

  private async removeUpload(filePath: string) {
    try {
      await unlink(filePath);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
        return;
      }
      Logger.error('Failed to remove an unpublished video file.', error instanceof Error ? error.stack : String(error));
    }
  }

  async recordView(id: string) {
    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException('Video view tracking is unavailable right now.');
    }

    try {
      await this.prisma.video.update({ where: { id }, data: { views: { increment: 1 } } });
      return { recorded: true };
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new NotFoundException('Video was not found.');
      }
      throw error;
    }
  }

  async toggleLike(videoId: string, user: AuthenticatedUser) {
    await this.requireActiveUser(user);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.videoLike.findUnique({
          where: { videoId_userId: { videoId, userId: user.sub } }
        });
        const liked = !existing;
        if (existing) {
          await transaction.videoLike.delete({ where: { id: existing.id } });
          await transaction.video.update({ where: { id: videoId }, data: { likes: { decrement: 1 } } });
        } else {
          await transaction.videoLike.create({ data: { videoId, userId: user.sub } });
          await transaction.video.update({ where: { id: videoId }, data: { likes: { increment: 1 } } });
        }
        const video = await transaction.video.findUniqueOrThrow({ where: { id: videoId }, select: { likes: true } });
        return { liked, likes: video.likes };
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new NotFoundException('Video was not found.');
      }
      throw error;
    }
  }

  async getLikedVideoIds(user: AuthenticatedUser) {
    await this.requireActiveUser(user);
    const likes = await this.prisma.videoLike.findMany({
      where: { userId: user.sub },
      select: { videoId: true }
    });
    return likes.map((like) => like.videoId);
  }

  async getComments(videoId: string) {
    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException('Comments are unavailable while the database is offline.');
    }
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        commentRecords: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true } } }
        }
      }
    });
    if (!video) throw new NotFoundException('Video was not found.');
    return video.commentRecords.map((comment) => ({
      id: comment.id,
      body: comment.body,
      author: `Shopper ${comment.user.id.slice(-4)}`,
      createdAt: comment.createdAt
    }));
  }

  async createComment(videoId: string, user: AuthenticatedUser, body: string) {
    await this.requireActiveUser(user);
    if (!body.trim()) throw new BadRequestException('Comment cannot be empty.');

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const comment = await transaction.videoComment.create({
          data: { videoId, userId: user.sub, body: body.trim() },
          include: { user: { select: { id: true } } }
        });
        await transaction.video.update({ where: { id: videoId }, data: { comments: { increment: 1 } } });
        return {
          id: comment.id,
          body: comment.body,
          author: `Shopper ${comment.user.id.slice(-4)}`,
          createdAt: comment.createdAt
        };
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new NotFoundException('Video was not found.');
      }
      throw error;
    }
  }

  private async requireActiveUser(user: AuthenticatedUser) {
    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException('Account access cannot be checked while the database is offline.');
    }
    const account = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { active: true } });
    if (!account?.active) {
      throw new ForbiddenException('This account is not active.');
    }
  }
}

@Injectable()
class SellerVideoAccessGuard {
  constructor(private readonly videosService: VideosService) {}

  async canActivate(context: import('@nestjs/common').ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    await this.videosService.requireSellerAccess(request.user);
    return true;
  }
}

@Controller('videos')
class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  findAll() {
    return this.videosService.findAll();
  }

  @Get('access')
  @UseGuards(JwtAuthGuard)
  sellerAccess(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.videosService.getSellerAccess(request.user);
  }

  @Get('likes')
  @UseGuards(JwtAuthGuard)
  likedVideos(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.videosService.getLikedVideoIds(request.user);
  }

  @Post(':id/view')
  recordView(@Req() request: Request & { params: { id: string } }) {
    return this.videosService.recordView(request.params.id);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  like(@Req() request: Request & { params: { id: string }; user: AuthenticatedUser }) {
    return this.videosService.toggleLike(request.params.id, request.user);
  }

  @Get(':id/comments')
  comments(@Req() request: Request & { params: { id: string } }) {
    return this.videosService.getComments(request.params.id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  comment(
    @Req() request: Request & { params: { id: string }; user: AuthenticatedUser },
    @Body() dto: CreateVideoCommentDto
  ) {
    return this.videosService.createComment(request.params.id, request.user, dto.body);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, SellerVideoAccessGuard)
  @UseInterceptors(FileInterceptor('video', {
    storage: diskStorage({
      destination: uploadDirectory,
      filename: (_request, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        callback(null, `${randomUUID()}${extension}`);
      }
    }),
    limits: { fileSize: MAX_UPLOAD_BYTES },
    fileFilter: (_request, file, callback) => {
      const acceptedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      callback(null, acceptedTypes.includes(file.mimetype));
    }
  }))
  upload(
    @Req() request: Request & { user: AuthenticatedUser },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateVideoDto
  ) {
    if (!file) {
      throw new BadRequestException('Choose an MP4, WebM, or MOV video file no larger than 100 MB.');
    }

    const videoUrl = `${apiConfig.publicUrl}/uploads/videos/${file.filename}`;
    return this.videosService.create(request.user, dto, videoUrl, file.path);
  }
}

@Module({
  controllers: [VideosController],
  providers: [VideosService, SellerVideoAccessGuard, JwtAuthGuard, PrismaService]
})
export class VideosModule {}
