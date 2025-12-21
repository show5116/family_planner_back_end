import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ description: '사용자 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: '이름', example: '홍길동' })
  name: string;

  @ApiProperty({
    description: '프로필 이미지 URL',
    example: 'https://example.com/profile.jpg',
    nullable: true,
  })
  profileImageUrl: string | null;
}

export class RoleDto {
  @ApiProperty({ description: '역할 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '역할명', example: 'OWNER' })
  name: string;

  @ApiProperty({
    description: '역할 색상 (HEX 형식)',
    example: '#6366F1',
  })
  color: string;

  @ApiProperty({
    description: '권한 배열',
    example: ['INVITE_MEMBER', 'UPDATE_GROUP'],
    isArray: true,
  })
  permissions: string[];
}

export class GroupMemberDto {
  @ApiProperty({ description: '멤버십 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid' })
  groupId: string;

  @ApiProperty({ description: '사용자 ID', example: 'uuid' })
  userId: string;

  @ApiProperty({ description: '역할 ID', example: 'uuid' })
  roleId: string;

  @ApiProperty({ type: RoleDto })
  role: RoleDto;

  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiProperty({
    description: '개인 설정 색상 (HEX 형식)',
    example: '#FF5733',
    nullable: true,
  })
  customColor: string | null;

  @ApiProperty({ description: '가입일', example: '2025-12-04T00:00:00Z' })
  joinedAt: Date;
}

export class GroupDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '그룹명', example: '우리 가족' })
  name: string;

  @ApiProperty({
    description: '그룹 설명',
    example: '가족 일정 관리',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: '초대 코드', example: 'AbC123Xy' })
  inviteCode: string;

  @ApiProperty({
    description: '초대 코드 만료 시간',
    example: '2025-12-24T00:00:00Z',
  })
  inviteCodeExpiresAt: Date;

  @ApiProperty({
    description: '그룹 기본 색상 (HEX 형식)',
    example: '#6366F1',
  })
  defaultColor: string;

  @ApiProperty({ description: '생성일', example: '2025-12-04T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: '2025-12-04T00:00:00Z' })
  updatedAt: Date;

  @ApiProperty({ type: [GroupMemberDto] })
  members: GroupMemberDto[];
}

export class MyGroupDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '그룹명', example: '우리 가족' })
  name: string;

  @ApiProperty({
    description: '그룹 설명',
    example: '가족 일정 관리',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: '초대 코드', example: 'AbC123Xy' })
  inviteCode: string;

  @ApiProperty({
    description: '초대 코드 만료 시간',
    example: '2025-12-24T00:00:00Z',
  })
  inviteCodeExpiresAt: Date;

  @ApiProperty({
    description: '그룹 기본 색상 (HEX 형식)',
    example: '#6366F1',
  })
  defaultColor: string;

  @ApiProperty({ description: '생성일', example: '2025-12-04T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: '2025-12-04T00:00:00Z' })
  updatedAt: Date;

  @ApiProperty({
    description: '내 색상 (개인 설정 또는 그룹 기본 색상)',
    example: '#FF5733',
  })
  myColor: string;

  @ApiProperty({ type: RoleDto, description: '내 역할' })
  myRole: RoleDto;

  @ApiProperty({
    description: '그룹 멤버 수',
    example: 5,
  })
  _count: {
    members: number;
  };
}

export class InviteCodeResponseDto {
  @ApiProperty({ description: '초대 코드', example: 'AbC123Xy' })
  inviteCode: string;

  @ApiProperty({
    description: '초대 코드 만료 시간',
    example: '2025-12-24T00:00:00Z',
  })
  inviteCodeExpiresAt: Date;
}

export class CreateGroupResponseDto {
  @ApiProperty({ type: GroupDto })
  data: GroupDto;
}

export class GetMyGroupsResponseDto {
  @ApiProperty({ type: [MyGroupDto] })
  data: MyGroupDto[];
}

export class GetGroupResponseDto {
  @ApiProperty({ type: GroupDto })
  data: GroupDto;
}

export class UpdateGroupResponseDto {
  @ApiProperty({ type: GroupDto })
  data: GroupDto;
}

export class DeleteGroupResponseDto {
  @ApiProperty({ example: '그룹이 삭제되었습니다' })
  message: string;
}

export class GetMembersResponseDto {
  @ApiProperty({ type: [GroupMemberDto] })
  data: GroupMemberDto[];
}

export class UpdateMemberRoleResponseDto {
  @ApiProperty({ type: GroupMemberDto })
  data: GroupMemberDto;
}

export class UpdateMyColorResponseDto {
  @ApiProperty({ example: '그룹 색상이 설정되었습니다' })
  message: string;

  @ApiProperty({
    description: '설정된 색상',
    example: '#FF5733',
    nullable: true,
  })
  customColor: string | null;
}

export class LeaveGroupResponseDto {
  @ApiProperty({ example: '그룹에서 나갔습니다' })
  message: string;
}

export class RemoveMemberResponseDto {
  @ApiProperty({ example: '멤버가 삭제되었습니다' })
  message: string;
}

export class JoinGroupResponseDto {
  @ApiProperty({
    example: '그룹 가입 요청이 전송되었습니다. 관리자 승인을 기다려주세요.',
    description:
      '이메일 초대를 받은 경우: "그룹 가입이 완료되었습니다", 일반 요청: "그룹 가입 요청이 전송되었습니다. 관리자 승인을 기다려주세요."',
  })
  message: string;

  @ApiProperty({
    description: '가입 요청 ID (일반 요청인 경우만)',
    example: 'uuid',
    required: false,
  })
  joinRequestId?: string;

  @ApiProperty({
    description: '그룹명 (일반 요청인 경우만)',
    example: '우리 가족',
    required: false,
  })
  groupName?: string;

  @ApiProperty({
    description: '요청 상태 (일반 요청인 경우만)',
    example: 'PENDING',
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    required: false,
  })
  status?: string;

  @ApiProperty({
    type: GroupMemberDto,
    description: '생성된 멤버 정보 (이메일 초대받은 경우만)',
    required: false,
  })
  member?: GroupMemberDto;

  @ApiProperty({
    type: GroupDto,
    description: '그룹 정보 (이메일 초대받은 경우만)',
    required: false,
  })
  group?: GroupDto;
}

export class TransferOwnershipResponseDto {
  @ApiProperty({ example: 'OWNER 권한이 성공적으로 양도되었습니다' })
  message: string;

  @ApiProperty({ type: GroupMemberDto })
  previousOwner: GroupMemberDto;

  @ApiProperty({ type: GroupMemberDto })
  newOwner: GroupMemberDto;
}

export class InviteByEmailResponseDto {
  @ApiProperty({ example: '초대 이메일이 발송되었습니다' })
  message: string;

  @ApiProperty({
    description: '초대받은 사용자의 이메일',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({ description: '그룹명', example: '우리 가족' })
  groupName: string;

  @ApiProperty({ description: '초대 코드', example: 'AbC123Xy' })
  inviteCode: string;

  @ApiProperty({
    description: '초대 코드 만료 시간',
    example: '2025-12-24T00:00:00Z',
  })
  inviteCodeExpiresAt: Date;

  @ApiProperty({ description: '가입 요청 ID', example: 'uuid' })
  joinRequestId: string;
}

export class GroupJoinRequestDto {
  @ApiProperty({ description: '가입 요청 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid' })
  groupId: string;

  @ApiProperty({
    description: '요청 타입',
    example: 'INVITE',
    enum: ['REQUEST', 'INVITE'],
  })
  type: string;

  @ApiProperty({
    description: '이메일',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: '상태',
    example: 'PENDING',
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
  })
  status: string;

  @ApiProperty({ description: '생성일', example: '2025-12-04T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: '2025-12-04T00:00:00Z' })
  updatedAt: Date;
}

export class GetJoinRequestsResponseDto {
  @ApiProperty({ type: [GroupJoinRequestDto] })
  data: GroupJoinRequestDto[];
}

export class AcceptJoinRequestResponseDto {
  @ApiProperty({ example: '가입 요청이 승인되었습니다' })
  message: string;

  @ApiProperty({ type: GroupMemberDto })
  member: GroupMemberDto;
}

export class RejectJoinRequestResponseDto {
  @ApiProperty({ example: '가입 요청이 거부되었습니다' })
  message: string;
}

export class CancelInviteResponseDto {
  @ApiProperty({ example: '초대가 취소되었습니다' })
  message: string;
}

export class ResendInviteResponseDto {
  @ApiProperty({ example: '초대 이메일이 재전송되었습니다' })
  message: string;

  @ApiProperty({
    description: '초대받은 사용자의 이메일',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({ description: '그룹명', example: '우리 가족' })
  groupName: string;

  @ApiProperty({ description: '초대 코드', example: 'AbC123Xy' })
  inviteCode: string;

  @ApiProperty({
    description: '초대 코드 만료 시간',
    example: '2025-12-24T00:00:00Z',
  })
  inviteCodeExpiresAt: Date;

  @ApiProperty({ description: '가입 요청 ID', example: 'uuid' })
  joinRequestId: string;
}
