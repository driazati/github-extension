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
      "div.branch-action-item.js-details-container.Details.open"
    )
    .forEach((item) => {
      if (item.style.height !== "800px") {
        changed = true;
      }
      item.style.height = "800px";
    });

  document.querySelectorAll("div.merge-status-list").forEach((item) => {
    if (item.style["max-height"] !== "100%") {
      changed = true;
    }
    item.style["max-height"] = "100%";
  });

  document.querySelectorAll("div.facehub-import-buttons").forEach((item) => {
    if (item.style["margin-top"] !== "35px") {
      changed = true;
    }
    item.style["margin-top"] = "35px";
  });

  return changed;
}
