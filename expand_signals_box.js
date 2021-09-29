featureFlag("Expand signals box", () => {
  document.addEventListener("DOMContentLoaded", expandSignalsBox);
  document.addEventListener("pjax:end", expandSignalsBox);

  backoffInterval({
    callback: expandSignalsBox,
    minWait: 10,
    maxWait: 200,
    factor: 1.05,
  });
});

function expandSignalsBox() {
  let changed = false;

  document
    .querySelectorAll(
      "div.merge-status-list.js-updatable-content-preserve-scroll-position"
    )
    .forEach((item) => {
      if (item.style["max-height"] !== "800px") {
        changed = true;
      }
      item.style["max-height"] = "800px";
    });

  return changed;
}
