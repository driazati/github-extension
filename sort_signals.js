featureFlag("Sort signals", () => {
  document.addEventListener("DOMContentLoaded", sortSignals);
  document.addEventListener("pjax:end", sortSignals);
  setInterval(sortSignals, 500);
});

function itemInfo(merge_status_item) {
  let classlist = merge_status_item.querySelector(
    "div.merge-status-icon > svg"
  ).classList;

  let status = "other";
  const statusMapping = {};
  if (classlist.contains("color-text-success")) {
    status = "success";
  } else if (classlist.contains("color-text-danger")) {
    status = "failed";
  } else if (classlist.contains("octicon-dot-fill")) {
    status = "pending";
  } else if (classlist.contains("octicon-skip")) {
    status = "skipped";
  }

  return {
    status: status,
    name: merge_status_item.querySelector("strong").innerText,
    element: merge_status_item,
  };
}

function sortSignalsBox(parent) {
  if (!parent.parentNode.children[1].innerText.includes("checks")) {
    return;
  }
  const elements = parent.querySelectorAll("div.merge-status-item");
  const buckets = {
    failed: [],
    pending: [],
    success: [],
    skipped: [],
    other: [],
  };

  let index = 0;
  for (const element of elements) {
    const info = itemInfo(element);
    info.index = index;
    index += 1;
    buckets[info.status].push(info);
  }

  for (const key in buckets) {
    buckets[key].sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      // a must be equal to b
      return 0;
    });
  }

  let order = [];
  let keys = ["failed", "pending", "success", "other", "skipped"];
  for (let key of keys) {
    for (let item of buckets[key]) {
      order.push(item);
    }
  }

  for (let item of order) {
    parent.appendChild(item.element);
  }
}

function sortSignals() {
  // Sort signals by type, then alphabetically
  document.querySelectorAll("div.merge-status-list").forEach((parent) => {
    try {
      sortSignalsBox(parent);
    } catch (e) {
      console.log(e);
    }
  });
}
