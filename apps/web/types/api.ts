// api-spec.md 기준 타입. BigInt PK는 모두 string.

export type Role = "BUYER" | "SELLER" | "ADMIN";
export type ConditionType = "NEW" | "USED" | "REFURBISHED";
export type ProductStatus =
  | "DRAFT"
  | "PENDING"
  | "ON_SALE"
  | "SOLD_OUT"
  | "HIDDEN";

export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
}

export interface Member {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  member: Member;
}

export interface SignupResponse {
  id: string;
  email: string;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  isMain: boolean;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface ProductListItem {
  id: string;
  sellerId: string;
  name: string;
  modelName: string | null;
  conditionType: ConditionType;
  price: number | null;
  priceNegotiable: boolean;
  region: string | null;
  status: ProductStatus;
  categoryId: string;
}

export interface ProductDetail extends ProductListItem {
  stock: number;
  description: string | null;
  viewCount: number;
  category?: Category;
  images: ProductImage[];
}

export interface ProductList {
  items: ProductListItem[];
  total: number;
  page: number;
  size: number;
}

export interface CreateProductBody {
  name: string;
  modelName?: string;
  categoryId: number;
  conditionType: ConditionType;
  price?: number | null;
  region?: string;
  description?: string;
}

export interface UpdateProductBody {
  name?: string;
  modelName?: string;
  price?: number | null;
  region?: string;
  description?: string;
  status?: ProductStatus;
}

// 시드된 카테고리 — 백엔드에 GET /categories 가 없는 P1 한정 정적 목록.
// 시드의 Promise.all 비결정성으로 name↔id 매핑은 실제 DB 기준.
export const SEED_CATEGORIES: Category[] = [
  { id: "1", name: "치료기기" },
  { id: "2", name: "재활·물리치료" },
  { id: "3", name: "검사·측정기기" },
  { id: "4", name: "환자모니터링" },
  { id: "5", name: "치과기기" },
  { id: "6", name: "영상진단기기" },
  { id: "7", name: "소모품·기타" },
  { id: "8", name: "한방기기" },
  { id: "9", name: "수술·마취기기" },
];
