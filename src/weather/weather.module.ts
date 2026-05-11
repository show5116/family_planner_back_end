import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WeatherController } from '@/weather/weather.controller';
import { WeatherService } from '@/weather/weather.service';
import { WeatherAlertScheduler } from '@/weather/weather-alert.scheduler';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [HttpModule, NotificationModule],
  controllers: [WeatherController],
  providers: [WeatherService, WeatherAlertScheduler],
})
export class WeatherModule {}
