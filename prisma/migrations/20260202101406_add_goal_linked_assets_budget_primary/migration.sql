-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkedBudgetId" TEXT,
ADD COLUMN     "linkedCategoryIds" JSONB;
