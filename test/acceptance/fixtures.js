// Shared relational layout assertion. External fonts are blocked by the specs.
import { expect } from '@playwright/test';

export async function expectNoOverflow(page) {
  const { limit, worst } = await page.evaluate(() => {
    // Measure against clientWidth, NOT the viewport width: content can only lay out
    // to clientWidth, which excludes the vertical scrollbar (~15px in headless
    // Chromium). Comparing against the viewport would hide up to a scrollbar's worth
    // of real overflow on any page that scrolls.
    const vw = document.documentElement.clientWidth;
    let found = null;
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return; // collapsed / hidden
      if (r.right > vw + 1 && (!found || r.right > found.right)) {
        // getAttribute, not el.className: on SVG elements className is an
        // SVGAnimatedString, which stringifies to "[object SVGAnimatedString]" and
        // would blank the diagnostic on exactly the icons most likely to overflow.
        found = { tag: el.tagName, cls: el.getAttribute('class') || '', right: r.right };
      }
    });
    return { limit: vw, worst: found };
  });

  expect(
    worst,
    `something overflows the ${limit}px layout width: ${JSON.stringify(worst)}`,
  ).toBeNull();
}
