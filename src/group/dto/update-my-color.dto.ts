import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMyColorDto {
  @ApiProperty({
    description: '개인 그룹 색상 (HEX 코드)',
    example: '#FF5733',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'validation.hex_color',
  })
  customColor: string;
}
