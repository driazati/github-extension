let removeSkippedSignals = false;

featureFlag("Sort signals", () => {
  chrome.storage.local.get("config", (container) => {
    removeSkippedSignals = container.config["Hide skipped signals"];
    if (removeSkippedSignals === undefined) {
      // default if no option saved yet
      removeSkippedSignals = true;
    }

    document.addEventListener("DOMContentLoaded", sortSignals);
    document.addEventListener("pjax:end", sortSignals);

    backoffInterval({
      callback: sortSignals,
      minWait: 10,
      maxWait: 200,
      factor: 1.05,
    });
  });
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

  let orderIsUnchanged = true;
  Array.from(parent.children).forEach((value, index) => {
    if (order[index].element !== value) {
      orderIsUnchanged = false;
    }
  });

  if (orderIsUnchanged) {
    return false;
  }

  for (let item of order) {
    parent.appendChild(item.element);
  }

  if (removeSkippedSignals) {
    for (const item of buckets["skipped"]) {
      remove(item.element);
    }
  }

  return true;
}

function sortSignals() {
  // Sort signals by type, then alphabetically
  let didAnything = false;
  document.querySelectorAll("div.merge-status-list").forEach((parent) => {
    if (!parent.parentNode.children[1].innerText.includes("checks")) {
      return;
    }
    didAnything = didAnything || sortSignalsBox(parent);
  });
  return didAnything;
}
