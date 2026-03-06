import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsObject } from 'class-validator';

export enum MinigameType {
  LADDER = 'LADDER',
  ROULETTE = 'ROULETTE',
}

export class CreateMinigameResultDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({
    description: '게임 타입',
    enum: MinigameType,
    example: MinigameType.LADDER,
  })
  @IsEnum(MinigameType)
  gameType: MinigameType;

  @ApiProperty({ description: '게임 제목', example: '저녁 메뉴 정하기' })
  @IsString()
  title: string;

  @ApiProperty({
    description: '참여자 이름 목록',
    example: ['아빠', '엄마', '민준'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  participants: string[];

  @ApiProperty({
    description: '결과 항목 목록',
    example: ['삼겹살', '치킨', '피자'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  options: string[];

  @ApiProperty({
    description: '게임 결과',
    example: { assignments: [{ participant: '아빠', option: '치킨' }] },
  })
  @IsObject()
  result: Record<string, unknown>;
}
