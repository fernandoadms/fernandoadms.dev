import { expect, test } from './fixtures';

const TAG_PATH = '/blog/tags/front-end/';

// Tag pages only exist once a tag has MIN_TAG_POSTS (3) posts: enable when front-end reaches that
test.describe.fixme('Tag page', () => {
  test('lists the posts of the tag with a matching heading and lede', async ({ page }) => {
    await page.goto(TAG_PATH);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Posts sobre front-end');
    await expect(page.locator('.lede')).toContainText(/\d+ posts? sobre front-end/);
    await expect(page.getByRole('link', { name: /front-end/i }).first()).toBeVisible();
    await expect(page.locator('main a[href^="/blog/"]:not([href*="/tags/"])').first()).toBeVisible();
  });

  test('links the language switch to the same topic in English', async ({ page }) => {
    await page.goto(TAG_PATH);

    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', /\/en\/blog\/tags\/front-end\/$/);
  });

  test('opens a post from the list', async ({ page }) => {
    await page.goto(TAG_PATH);
    const post = page.locator('main a[href^="/blog/"]:not([href*="/tags/"])').first();
    const href = await post.getAttribute('href');

    await post.click();

    await expect(page).toHaveURL(href ?? '');
  });
});
