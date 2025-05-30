-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "isAgent" BOOLEAN NOT NULL DEFAULT false,
    "walletAddress" TEXT NOT NULL,
    "walletPrivateKey" TEXT NOT NULL,
    "ecdhPublicKey" TEXT NOT NULL,
    "ecdhPrivateKey" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "invocationKey" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFunction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cid" TEXT NOT NULL,
    "functionArn" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserFunction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKey_key" ON "User"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_invocationKey_key" ON "User"("invocationKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserFunction_cid_key" ON "UserFunction"("cid");

-- CreateIndex
CREATE UNIQUE INDEX "UserFunction_functionArn_key" ON "UserFunction"("functionArn");

-- AddForeignKey
ALTER TABLE "UserFunction" ADD CONSTRAINT "UserFunction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
