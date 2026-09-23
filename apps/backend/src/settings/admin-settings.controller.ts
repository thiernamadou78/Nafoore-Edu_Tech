import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Permission } from '../auth/permissions';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Permission('site')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAll() {
    return this.settingsService.getAllSettings();
  }

  @Patch(':key')
  update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.settingsService.upsert(key, dto.value);
  }
}
