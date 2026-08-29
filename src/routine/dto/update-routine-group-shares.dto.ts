import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateRoutineGroupSharesDto {
  @ApiProperty({
    description:
      '공유할 그룹 ID 전체 목록 (기존 공유 목록을 이 값으로 통째 교체, 빈 배열이면 전체 해제)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  groupIds: string[];
}
