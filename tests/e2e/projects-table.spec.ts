import { type Locator, type Page, expect, test } from "@playwright/test";

import { E2E, STORAGE } from "./env";
import { type Client, ensureWorkspace, resetFixture, signIn } from "./fixture";

const url = `/w/${E2E.workspaceSlug}/projects`;

// Every test starts from the same rows, layouts and sharing mode.
let ownerClient: Client;
let memberClient: Client;
let workspaceId: string;

test.beforeAll(async () => {
  ownerClient = (await signIn(E2E.owner.email, E2E.owner.password)).client;
  memberClient = (await signIn(E2E.member.email, E2E.member.password)).client;
  workspaceId = await ensureWorkspace(ownerClient, memberClient);
});

test.beforeEach(async () => {
  await resetFixture(ownerClient, memberClient, workspaceId);
});

/** Project names in the order they are shown, per department group. */
async function rowNames(page: Page, group: string): Promise<string[]> {
  const tbody = page
    .locator(`tbody[data-group]`)
    .filter({ has: page.getByTestId("group-header").filter({ hasText: group }) });
  return tbody.getByTestId("data-row").locator('td[data-col="name"] a').allInnerTexts();
}

async function headerNames(page: Page): Promise<string[]> {
  return page.locator("thead th[data-col] button > span").allInnerTexts();
}

function row(page: Page, name: string): Locator {
  return page
    .getByTestId("data-row")
    .filter({ has: page.locator(`td[data-col="name"] a`, { hasText: new RegExp(`^${name}$`) }) });
}

/** Drags with the pointer in small steps so dnd-kit's activation distance and collision detection see it. */
async function dragTo(page: Page, handle: Locator, target: Locator, offsetY = 0) {
  const from = await handle.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("drag endpoints not visible");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 8, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + offsetY, { steps: 16 });
  await page.waitForTimeout(120);
  await page.mouse.up();
}

test.describe("projects table", () => {
  test.use({ storageState: STORAGE.owner });

  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[browser pageerror] ${err.message}`));
    await page.goto(url);
    // Wait for hydration: dnd-kit only listens for pointer events once React has mounted.
    await expect(page.locator('[data-testid="data-table"][data-hydrated="true"]')).toBeVisible();
    await expect
      .poll(() => rowNames(page, "Alpha"))
      .toEqual(["Alpha One", "Alpha Two", "Alpha Three"]);
  });

  test("drags a row within its department and the order survives a reload", async ({ page }) => {
    const three = row(page, "Alpha Three");
    await three.hover();
    await dragTo(page, three.getByTestId("row-drag-handle"), row(page, "Alpha One"), -8);
    await expect
      .poll(() => rowNames(page, "Alpha"))
      .toEqual(["Alpha Three", "Alpha One", "Alpha Two"]);
    await expect(page.getByText(/Moved Alpha Three/)).toBeVisible();

    await page.reload();
    await expect
      .poll(() => rowNames(page, "Alpha"))
      .toEqual(["Alpha Three", "Alpha One", "Alpha Two"]);
  });

  test("Escape cancels a drag", async ({ page }) => {
    const two = row(page, "Alpha Two");
    await two.hover();
    const handle = two.getByTestId("row-drag-handle");
    const from = await handle.boundingBox();
    const target = await row(page, "Alpha One").boundingBox();
    await page.mouse.move(from!.x + 5, from!.y + 5);
    await page.mouse.down();
    await page.mouse.move(from!.x + 5, from!.y + 14, { steps: 3 });
    await page.mouse.move(target!.x + 40, target!.y + 4, { steps: 10 });
    await expect(page.getByTestId("drag-marker")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect(page.getByTestId("drag-marker")).toHaveCount(0);
    await expect
      .poll(() => rowNames(page, "Alpha"))
      .toEqual(["Alpha One", "Alpha Two", "Alpha Three"]);
  });

  test("moves a row with the keyboard", async ({ page }) => {
    const two = row(page, "Beta Two");
    await two.hover();
    const handle = two.getByTestId("row-drag-handle");
    await handle.focus();
    await page.keyboard.press("Space");
    await expect(handle).toHaveAttribute("aria-pressed", "true"); // picked up
    await page.keyboard.press("ArrowUp");
    // The screen-reader announcement confirms the new position before we drop.
    await expect(
      page.getByRole("status").filter({ hasText: /Position 1 of 2 in Beta/ }),
    ).toBeAttached();
    await page.keyboard.press("Space");
    await expect.poll(() => rowNames(page, "Beta")).toEqual(["Beta Two", "Beta One"]);
    await expect(page.getByText(/Moved Beta Two/)).toBeVisible();
  });

  test("moving a row to another department asks first, then moves it", async ({ page }) => {
    const one = row(page, "Alpha One");
    await one.hover();
    await dragTo(page, one.getByTestId("row-drag-handle"), row(page, "Beta Two"), 8);
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Move Alpha One to Beta?");
    await dialog.getByRole("button", { name: "Move" }).click();
    await expect.poll(() => rowNames(page, "Beta")).toEqual(["Beta One", "Beta Two", "Alpha One"]);
    await expect.poll(() => rowNames(page, "Alpha")).toEqual(["Alpha Two", "Alpha Three"]);
    // The toast appears once the server has confirmed; reloading earlier would race the save.
    await expect(page.getByText(/Moved Alpha One to Beta/)).toBeVisible();

    await page.reload();
    await expect.poll(() => rowNames(page, "Beta")).toEqual(["Beta One", "Beta Two", "Alpha One"]);
  });

  test("drags a column header and the order survives a reload", async ({ page }) => {
    const headers = await headerNames(page);
    expect(headers.slice(0, 2)).toEqual(["Project", "Owner"]);
    const owner = page.locator('thead th[data-col="owner"] button').first();
    const project = page.locator('thead th[data-col="name"] button').first();
    const from = await owner.boundingBox();
    const to = await project.boundingBox();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(from!.x + from!.width / 2 - 10, from!.y + from!.height / 2, { steps: 4 });
    await page.mouse.move(to!.x + 10, to!.y + to!.height / 2, { steps: 16 });
    await page.waitForTimeout(120);
    await page.mouse.up();
    await expect
      .poll(() => headerNames(page))
      .toEqual(expect.arrayContaining(["Owner", "Project"]));
    await expect
      .poll(async () => (await headerNames(page)).slice(0, 2))
      .toEqual(["Owner", "Project"]);
    // Shared layouts show who changed them once the save has round-tripped.
    await expect(page.getByTestId("layout-last-changed")).toContainText("Olive Owner");

    await page.reload();
    await expect
      .poll(async () => (await headerNames(page)).slice(0, 2))
      .toEqual(["Owner", "Project"]);
  });

  test("sorts from the header and keeps the sort in the URL", async ({ page }) => {
    await page.locator('thead th[data-col="name"] button').first().click();
    await expect(page.locator('thead th[data-col="name"]')).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await expect(page).toHaveURL(/sort=name/);
    await expect
      .poll(() => rowNames(page, "Alpha"))
      .toEqual(["Alpha One", "Alpha Three", "Alpha Two"]);
    await page.locator('thead th[data-col="name"] button').first().click();
    await expect(page).toHaveURL(/sort=-name/);
    await page.locator('thead th[data-col="name"] button').first().click();
    await expect(page).not.toHaveURL(/sort=/);
  });

  test("filters from a column menu and shows a chip", async ({ page }) => {
    const header = page.locator('thead th[data-col="name"]');
    await header.hover();
    await header.getByRole("button", { name: /column options/ }).click();
    await page.getByRole("menuitem", { name: "Filter…" }).click();
    await page.getByLabel("Contains").fill("Beta");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByTestId("filter-chips")).toContainText(/Project:\s*“Beta”/);
    await expect(page).toHaveURL(/f\.name=Beta/);
    await expect.poll(() => rowNames(page, "Alpha")).toEqual([]);
    await expect.poll(() => rowNames(page, "Beta")).toEqual(["Beta One", "Beta Two"]);
    await page.getByRole("button", { name: "Remove Project filter" }).click();
    await expect.poll(() => rowNames(page, "Alpha")).toHaveLength(3);
  });
});

test.describe("layout sharing", () => {
  test("shared mode is seen by everyone; personal mode isolates changes", async ({ browser }) => {
    const ownerContext = await browser.newContext({ storageState: STORAGE.owner });
    const memberContext = await browser.newContext({ storageState: STORAGE.member });
    const owner = await ownerContext.newPage();
    const member = await memberContext.newPage();

    // Shared: the owner hides "Due" and the member sees it gone.
    await owner.goto(url);
    await expect(owner.locator('[data-testid="data-table"][data-hydrated="true"]')).toBeVisible();
    await owner.getByRole("button", { name: "Columns" }).click();
    await owner.getByRole("menuitemcheckbox", { name: "Due", exact: true }).click();
    await owner.keyboard.press("Escape");
    await expect(owner.locator('thead th[data-col="due"]')).toHaveCount(0);
    await expect(owner.getByTestId("layout-last-changed")).toContainText("Olive Owner");

    await member.goto(url);
    await expect(member.locator('[data-testid="data-table"][data-hydrated="true"]')).toBeVisible();
    await expect(member.locator('thead th[data-col="due"]')).toHaveCount(0);

    // Switch to personal: the member's change stays theirs.
    await owner.goto(`/w/${E2E.workspaceSlug}/settings`);
    await owner.getByLabel("Layout sharing").getByText("Everything personal").click();
    await expect(owner.getByText("Layout sharing updated.")).toBeVisible();

    await member.goto(url);
    await expect(member.locator('thead th[data-col="due"]')).toHaveCount(1); // personal layout starts from defaults
    await member.getByRole("button", { name: "Columns" }).click();
    await member.getByRole("menuitemcheckbox", { name: "Status", exact: true }).click();
    await member.keyboard.press("Escape");
    await expect(member.locator('thead th[data-col="status"]')).toHaveCount(0);

    await owner.goto(url);
    await expect(owner.locator('thead th[data-col="status"]')).toHaveCount(1);

    await ownerContext.close();
    await memberContext.close();
  });
});
