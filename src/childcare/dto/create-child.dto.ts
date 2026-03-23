import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, MaxLength } from 'class-validator';

export class CreateChildDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '자녀 이름', example: '김민준' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: '생년월일 (YYYY-MM-DD)', example: '2024-01-15' })
  @IsDateString()
  birthDate: string;
}
