-- CreateTable
CREATE TABLE "OTPRequest" (
    "token" TEXT NOT NULL,
    "requestedPhoneNumber" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "otpCode" TEXT,
    "telegramUserId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTPRequest_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "UserToken" (
    "userId" BIGINT NOT NULL,
    "token" TEXT NOT NULL,

    CONSTRAINT "UserToken_pkey" PRIMARY KEY ("userId")
);
