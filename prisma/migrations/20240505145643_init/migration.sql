-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'TRUSTED', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "discord" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mod" (
    "id" TEXT NOT NULL,
    "uploaderId" INTEGER NOT NULL,
    "latestVersionValue" TEXT,

    CONSTRAINT "Mod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModDependency" (
    "id" SERIAL NOT NULL,
    "modId" TEXT NOT NULL,
    "modVersionValue" TEXT NOT NULL,
    "dependencyId" TEXT NOT NULL,
    "dependencyName" TEXT NOT NULL,
    "dependencyVersionRange" TEXT NOT NULL,

    CONSTRAINT "ModDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModVersion" (
    "modId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "prerelease" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "author" TEXT,
    "description" TEXT,
    "sdkVersion" TEXT,
    "gameVersions" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "cdnContentPath" TEXT NOT NULL,
    "cdnIconPath" TEXT,

    CONSTRAINT "ModVersion_pkey" PRIMARY KEY ("modId","version")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_token_key" ON "Token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Mod_id_latestVersionValue_key" ON "Mod"("id", "latestVersionValue");

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mod" ADD CONSTRAINT "Mod_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mod" ADD CONSTRAINT "Mod_id_latestVersionValue_fkey" FOREIGN KEY ("id", "latestVersionValue") REFERENCES "ModVersion"("modId", "version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModDependency" ADD CONSTRAINT "ModDependency_modId_modVersionValue_fkey" FOREIGN KEY ("modId", "modVersionValue") REFERENCES "ModVersion"("modId", "version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModVersion" ADD CONSTRAINT "ModVersion_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
