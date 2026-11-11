import { expect, test } from './fixtures';

test.describe('Lab', () => {
  test.beforeEach(async ({ labPage }) => {
    await labPage.goto();
  });

  test('lists projects with external links', async ({ labPage }) => {
    await expect(labPage.heading).toBeVisible();
    await expect(labPage.projects).toHaveCount(5);
    for (const project of await labPage.projects.all()) {
      await expect(project).toHaveAttribute('href', /^https:\/\//);
    }

    await expect(labPage.project(/todo-api/)).toHaveAttribute('href', 'https://github.com/fernandoadms/todo-api');
    await expect(labPage.project(/clone-tabnews/)).toHaveAttribute('href', 'https://clone-tabnews-omega-six.vercel.app');
  });

  test('marks no project as rebuilt', async ({ labPage }) => {
    await expect(labPage.projects.getByText('refeito em 2026', { exact: true })).toHaveCount(0);
  });

  test('links to more projects on GitHub', async ({ labPage }) => {
    await expect(labPage.moreOnGithub).toHaveAttribute('href', /github\.com\/fernandoadms/);
  });
});
