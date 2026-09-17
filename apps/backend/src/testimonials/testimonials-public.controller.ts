import { Controller, Get } from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';

@Controller('testimonials')
export class TestimonialsPublicController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Get('public')
  listPublished() {
    return this.testimonialsService.listPublished();
  }
}
