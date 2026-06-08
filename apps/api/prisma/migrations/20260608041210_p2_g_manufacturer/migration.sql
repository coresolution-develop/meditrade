-- CreateTable
CREATE TABLE "manufacturer" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "country" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "manufacturer_pkey" PRIMARY KEY ("id")
);
