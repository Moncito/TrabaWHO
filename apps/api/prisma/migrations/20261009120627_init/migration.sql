-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'WORKER');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('EMERGENCY', 'TODAY', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "services" TEXT[],
    "city" TEXT NOT NULL,
    "barangay" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "clientRef" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workerId" TEXT,
    "serviceCode" TEXT NOT NULL,
    "taskCode" TEXT NOT NULL,
    "urgency" "Urgency" NOT NULL,
    "hazards" TEXT[],
    "aiSummary" TEXT NOT NULL,
    "aiConfidence" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "editedByUser" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "barangay" TEXT NOT NULL,
    "priceMin" INTEGER NOT NULL,
    "priceMax" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdOffline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobReport" (
    "id" TEXT NOT NULL,
    "clientRef" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "tasksDone" TEXT[],
    "materials" JSONB NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "laborCost" INTEGER NOT NULL,
    "materialsCost" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "createdOffline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_clientRef_key" ON "Booking"("clientRef");

-- CreateIndex
CREATE UNIQUE INDEX "JobReport_clientRef_key" ON "JobReport"("clientRef");

-- CreateIndex
CREATE UNIQUE INDEX "JobReport_bookingId_key" ON "JobReport"("bookingId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReport" ADD CONSTRAINT "JobReport_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
