-- CreateEnum
CREATE TYPE "VerifyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('OPEN', 'QUOTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('ONLINE', 'VISIT_SELLER', 'VISIT_BUYER');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED', 'RESCHEDULE_PROPOSED', 'CONFIRMED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SlotProposer" AS ENUM ('BUYER', 'SELLER');

-- CreateTable
CREATE TABLE "business_info" (
    "id" BIGSERIAL NOT NULL,
    "member_id" BIGINT NOT NULL,
    "company_name" VARCHAR(100) NOT NULL,
    "biz_reg_no" VARCHAR(20) NOT NULL,
    "device_sales_license_no" VARCHAR(50),
    "verify_status" "VerifyStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite" (
    "id" BIGSERIAL NOT NULL,
    "buyer_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry" (
    "id" BIGSERIAL NOT NULL,
    "product_id" BIGINT NOT NULL,
    "buyer_id" BIGINT NOT NULL,
    "seller_id" BIGINT NOT NULL,
    "message" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote" (
    "id" BIGSERIAL NOT NULL,
    "inquiry_id" BIGINT NOT NULL,
    "quote_price" BIGINT NOT NULL,
    "valid_until" DATE NOT NULL,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_request" (
    "id" BIGSERIAL NOT NULL,
    "buyer_id" BIGINT NOT NULL,
    "seller_id" BIGINT NOT NULL,
    "product_id" BIGINT,
    "meeting_type" "MeetingType" NOT NULL,
    "purpose" VARCHAR(100) NOT NULL,
    "message" TEXT,
    "location" VARCHAR(200),
    "confirmed_at" TIMESTAMP(3),
    "status" "MeetingStatus" NOT NULL DEFAULT 'REQUESTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_slot" (
    "id" BIGSERIAL NOT NULL,
    "meeting_id" BIGINT NOT NULL,
    "proposed_at" TIMESTAMP(3) NOT NULL,
    "proposed_by" "SlotProposer" NOT NULL,
    "is_selected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "meeting_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal" (
    "id" BIGSERIAL NOT NULL,
    "inquiry_id" BIGINT,
    "product_id" BIGINT NOT NULL,
    "buyer_id" BIGINT NOT NULL,
    "seller_id" BIGINT NOT NULL,
    "final_price" BIGINT NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'REQUESTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" BIGSERIAL NOT NULL,
    "deal_id" BIGINT NOT NULL,
    "buyer_id" BIGINT NOT NULL,
    "seller_id" BIGINT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" BIGSERIAL NOT NULL,
    "member_id" BIGINT NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "link_url" VARCHAR(500),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_info_member_id_key" ON "business_info"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_buyer_id_product_id_key" ON "favorite"("buyer_id", "product_id");

-- CreateIndex
CREATE INDEX "inquiry_seller_id_idx" ON "inquiry"("seller_id");

-- CreateIndex
CREATE INDEX "inquiry_buyer_id_idx" ON "inquiry"("buyer_id");

-- CreateIndex
CREATE INDEX "meeting_request_seller_id_idx" ON "meeting_request"("seller_id");

-- CreateIndex
CREATE INDEX "meeting_request_buyer_id_idx" ON "meeting_request"("buyer_id");

-- CreateIndex
CREATE INDEX "notification_member_id_is_read_idx" ON "notification"("member_id", "is_read");

-- AddForeignKey
ALTER TABLE "business_info" ADD CONSTRAINT "business_info_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_slot" ADD CONSTRAINT "meeting_slot_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meeting_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
