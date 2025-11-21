import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum GroupMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: '멤버 역할',
    enum: GroupMemberRole,
    example: GroupMemberRole.ADMIN,
  })
  @IsEnum(GroupMemberRole)
  role: GroupMemberRole;
}
