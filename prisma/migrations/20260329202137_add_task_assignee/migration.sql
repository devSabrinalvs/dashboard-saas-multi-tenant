-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assigneeUserId" TEXT;

-- CreateIndex
CREATE INDEX "Task_orgId_assigneeUserId_idx" ON "Task"("orgId", "assigneeUserId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
