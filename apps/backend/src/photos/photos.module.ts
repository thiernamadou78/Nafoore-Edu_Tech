import { Global, Module } from '@nestjs/common';
import { PhotosService } from './photos.service';

@Global()
@Module({
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}
