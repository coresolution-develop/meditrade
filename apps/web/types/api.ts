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

// ────────────────────────────────────────────────────────────────────
// Phase 2 타입 (api-spec.md 4~11장). BigInt PK 는 모두 string.
// ────────────────────────────────────────────────────────────────────

// 4. 사업자 인증 (business-info)
export type VerifyStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface BusinessInfo {
  id: string;
  memberId: string;
  companyName: string;
  bizRegNo: string;
  deviceSalesLicenseNo: string | null;
  verifyStatus: VerifyStatus;
  createdAt: string;
}

export interface CreateBusinessInfoBody {
  companyName: string;
  bizRegNo: string;
  deviceSalesLicenseNo?: string;
}

// 5. 찜 (favorites)
export interface Favorite {
  id: string;
  buyerId: string;
  productId: string;
  createdAt: string;
}

export interface FavoriteItem {
  id: string;
  productId: string;
  createdAt: string;
  // 대상 상품이 삭제되면 null 일 수 있다.
  product: ProductListItem | null;
}

export interface FavoriteList {
  items: FavoriteItem[];
  total: number;
}

// 6. 문의·견적 (inquiry / quote)
export type InquiryStatus = "OPEN" | "QUOTED" | "CLOSED";

export interface Quote {
  id: string;
  inquiryId: string;
  quotePrice: number;
  validUntil: string;
  memo: string | null;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  message: string | null;
  status: InquiryStatus;
  createdAt: string;
  quotes: Quote[];
}

export interface InquiryList {
  items: Inquiry[];
  total: number;
}

export interface CreateInquiryBody {
  productId: number;
  message?: string;
}

export interface CreateQuoteBody {
  quotePrice: number;
  validUntil: string; // yyyy-MM-dd
  memo?: string;
}

// 7. 미팅 요청 (meeting)
export type MeetingType = "ONLINE" | "VISIT_SELLER" | "VISIT_BUYER";
export type MeetingStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "REJECTED"
  | "RESCHEDULE_PROPOSED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELED";
export type SlotProposer = "BUYER" | "SELLER";

export interface MeetingSlot {
  id: string;
  meetingId: string;
  proposedAt: string;
  proposedBy: SlotProposer;
  isSelected: boolean;
}

export interface MeetingRequest {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string | null;
  meetingType: MeetingType;
  purpose: string;
  message: string | null;
  location: string | null;
  confirmedAt: string | null;
  status: MeetingStatus;
  createdAt: string;
  slots: MeetingSlot[];
}

export interface MeetingList {
  items: MeetingRequest[];
  total: number;
}

export interface CreateMeetingBody {
  sellerId: number;
  productId?: number;
  meetingType: MeetingType;
  purpose: string;
  preferredSlots: string[]; // ISO 8601, 1~3개, 미래
  location?: string;
  message?: string;
}

export interface UpdateMeetingBody {
  status: MeetingStatus;
  selectedSlot?: string; // ACCEPTED / 일부 CONFIRMED
  proposedSlot?: string; // RESCHEDULE_PROPOSED
}

// 8. 거래 (deal)
export type DealStatus = "REQUESTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";

export interface Deal {
  id: string;
  inquiryId: string | null;
  productId: string;
  buyerId: string;
  sellerId: string;
  finalPrice: number;
  status: DealStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface DealList {
  items: Deal[];
  total: number;
}

export interface CreateDealBody {
  inquiryId: number;
  quoteId?: number;
}

// 9. 리뷰 (review)
export interface Review {
  id: string;
  dealId: string;
  buyerId: string;
  sellerId: string;
  rating: number;
  content: string | null;
  createdAt: string;
}

export interface SellerReviews {
  sellerId: string;
  total: number;
  averageRating: number | null;
  items: Review[];
}

export interface CreateReviewBody {
  dealId: number;
  rating: number;
  content?: string;
}

// 10. 알림 (notification)
// 알려진 타입. 백엔드가 새 타입을 추가할 수 있으므로 Notification.type 은 string.
export type NotificationType =
  | "INQUIRY_RECEIVED"
  | "QUOTE_RECEIVED"
  | "DEAL_STATUS_CHANGED"
  | "MEETING_REQUESTED"
  | "MEETING_RESPONDED"
  | "BUSINESS_INFO_VERIFIED"
  | "MEMBER_STATUS_CHANGED";

export interface Notification {
  id: string;
  memberId: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationList {
  items: Notification[];
  total: number;
  unread: number;
}

// 11. 관리자 (admin)
export type MemberStatus = "ACTIVE" | "SUSPENDED" | "PENDING";

export interface AdminCategory {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
}

export interface AdminCategoryList {
  items: AdminCategory[];
  total: number;
}

export interface Manufacturer {
  id: string;
  name: string;
  country: string | null;
  sortOrder: number;
}

export interface ManufacturerList {
  items: Manufacturer[];
  total: number;
}

export interface MemberSummary {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: MemberStatus;
}

// 관리자 목록 응답 (보강된 조회 API)
export interface AdminMemberItem extends MemberSummary {
  phone: string | null;
  createdAt: string;
}
export interface AdminMemberList {
  items: AdminMemberItem[];
  total: number;
  page: number;
  size: number;
}

export interface AdminBusinessInfoItem extends BusinessInfo {
  member: { id: string; email: string; name: string } | null;
}
export interface AdminBusinessInfoList {
  items: AdminBusinessInfoItem[];
  total: number;
}

export interface AdminProductItem {
  id: string;
  sellerId: string;
  categoryId: string;
  name: string;
  modelName: string | null;
  conditionType: ConditionType;
  price: number | null;
  status: ProductStatus;
  createdAt: string;
}
export interface AdminProductList {
  items: AdminProductItem[];
  total: number;
  page: number;
  size: number;
}

// 관리자 변경 body
export interface UpdateBusinessInfoVerifyBody {
  verifyStatus: "APPROVED" | "REJECTED";
  reason?: string;
}
export interface UpdateProductStatusBody {
  status: ProductStatus;
}
export interface UpdateMemberStatusBody {
  status: "ACTIVE" | "SUSPENDED";
}
export interface CreateCategoryBody {
  name: string;
  parentId?: number;
  sortOrder?: number;
}
export interface UpdateCategoryBody {
  name?: string;
  parentId?: number;
  sortOrder?: number;
}
export interface CreateManufacturerBody {
  name: string;
  country?: string;
  sortOrder?: number;
}
export interface UpdateManufacturerBody {
  name?: string;
  country?: string;
  sortOrder?: number;
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
