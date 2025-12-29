import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PinAnnouncementDto {
  @ApiProperty({
    description: '고정 여부',
    example: true,
  })
  @IsBoolean()
  isPinned: boolean;
}
