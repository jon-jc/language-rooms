-- CreateEnum
CREATE TYPE "WhiteboardItemKind" AS ENUM ('STROKE', 'IMAGE');

-- CreateTable
CREATE TABLE "WhiteboardItem" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "WhiteboardItemKind" NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhiteboardItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhiteboardItem_roomId_createdAt_idx" ON "WhiteboardItem"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "WhiteboardItem" ADD CONSTRAINT "WhiteboardItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardItem" ADD CONSTRAINT "WhiteboardItem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
