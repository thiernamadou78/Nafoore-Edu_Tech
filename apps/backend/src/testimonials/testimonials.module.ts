import { Module } from '@nestjs/common';
import { TestimonialsController } from './testimonials.controller';
import { TestimonialsPublicController } from './testimonials-public.controller';
import { TestimonialsService } from './testimonials.service';

@Module({
  controllers: [TestimonialsController, TestimonialsPublicController],
  providers: [TestimonialsService],
})
export class TestimonialsModule {}
