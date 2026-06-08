import { IsInt, Min } from 'class-validator';

export class CreateFavoriteDto {
  @IsInt()
  @Min(1)
  productId!: number;
}
