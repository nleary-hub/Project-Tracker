import { E2E, STORAGE } from "./env";
import { ensureWorkspace, resetFixture, signIn, writeStorageState } from "./fixture";

/**
 * Signs both e2e users in (writing Playwright storage states with the Supabase
 * auth cookie) and makes sure the fixture workspace exists. Specs reset the
 * rows themselves before each test.
 */
export default async function globalSetup() {
  const owner = await signIn(E2E.owner.email, E2E.owner.password);
  const member = await signIn(E2E.member.email, E2E.member.password);
  writeStorageState(STORAGE.owner, owner.cookies);
  writeStorageState(STORAGE.member, member.cookies);

  const workspaceId = await ensureWorkspace(owner.client, member.client);
  await resetFixture(owner.client, member.client, workspaceId);
}
