import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { AdminReviewsController, FamilyReviewsController } from './reviews.controller';

@Module({
  controllers: [FamilyReviewsController, AdminReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
