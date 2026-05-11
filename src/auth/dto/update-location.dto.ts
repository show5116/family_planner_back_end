import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({ description: '위도', example: 37.5665 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: '경도', example: 126.978 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon: number;
}
