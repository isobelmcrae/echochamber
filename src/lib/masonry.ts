/**
 * Packs a grid's items like a pinboard: each spans as many 1px rows as it is tall (plus the
 * gutter), so the grid's own auto-placement drops it into whichever column ends highest.
 * Until it runs (server render), `.masonry` falls back to plain rows.
 */
export function masonry(grid: HTMLElement) {
  const fit = (item: Element, height: number) => {
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    (item as HTMLElement).style.gridRowEnd = `span ${Math.ceil(height + gap)}`;
  };
  const sizes = new ResizeObserver((entries) => {
    for (const entry of entries) fit(entry.target, entry.borderBoxSize[0]!.blockSize);
  });
  const children = new MutationObserver((records) => {
    for (const { addedNodes, removedNodes } of records) {
      for (const node of addedNodes) if (node instanceof HTMLElement) sizes.observe(node);
      for (const node of removedNodes) if (node instanceof HTMLElement) sizes.unobserve(node);
    }
  });
  for (const item of grid.children) sizes.observe(item);
  children.observe(grid, { childList: true });
  grid.dataset.packed = "";
  return () => {
    sizes.disconnect();
    children.disconnect();
    delete grid.dataset.packed;
  };
}
