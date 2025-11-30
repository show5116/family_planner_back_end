import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: '역할 ID (Role 테이블의 ID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  roleId: string;
}
