import { defineConfig } from "@prisma/client/config";

export default defineConfig({
  // This tells Prisma where the URL actually lives
  connectionString: process.env.DATABASE_URL,
});
