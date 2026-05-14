import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateQuantityDto {
  @ApiProperty({ example: 1, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;
}
