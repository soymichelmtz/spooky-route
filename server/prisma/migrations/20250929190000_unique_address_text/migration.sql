-- Add unique constraint to House.addressText
PRAGMA foreign_keys=OFF;
CREATE UNIQUE INDEX "House_addressText_key" ON "House"("addressText");
PRAGMA foreign_keys=ON;
