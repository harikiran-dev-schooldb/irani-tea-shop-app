ALTER TABLE "transactions" ADD COLUMN "payment_mode" text DEFAULT 'cash' NOT NULL;--> statement-breakpoint
CREATE INDEX "transactions_payment_mode_idx" ON "transactions" USING btree ("payment_mode");