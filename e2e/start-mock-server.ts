/**
 * Standalone script to start the mock Supabase server.
 * Run as a Playwright webServer so it stays alive during tests.
 */
import { startMockSupabase } from "./mock-server";

const PORT = 54399;

startMockSupabase(PORT).then(({ url }) => {
  console.log(`Mock Supabase ready at ${url}`);
});
