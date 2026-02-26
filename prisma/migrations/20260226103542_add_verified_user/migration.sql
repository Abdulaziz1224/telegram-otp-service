-- CreateTable
CREATE TABLE "VerifiedUser" (
    "phoneNumber" TEXT NOT NULL,
    "telegramUserId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerifiedUser_pkey" PRIMARY KEY ("phoneNumber")
);
