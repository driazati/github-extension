let properties = [
  {
    name: "GitHub Token",
    title:
      'GitHub OAuth Token <a href="https://github.com/settings/tokens">(get one here, add "repo" permissions)</a>',
    type: "text",
    desc: "This is needed to make requests to the GitHub API",
  },
  {
    name: "Sort signals",
    desc: "Sort GitHub CI signals by failed/pending/success/skipped",
    type: "checkbox",
  },
  {
    name: "Show build status",
    desc: "When viewing a list of PRs, show extra information about each (line count, diff, etc)",
    type: "checkbox",
  },
  {
    name: "Unminimize comments",
    desc: "Automatically unminimize all comments on PRs",
    type: "checkbox",
  },
  {
    name: "Disable pjax",
    desc: "Turn off GitHub's SPA features so links aren't stale (may increase load times)",
    type: "checkbox",
  },
];

function fromHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.children[0];
}

// Save settings to chrome.storage.local
function save() {
  let data = {};

  properties.forEach((prop) => {
    let value = null;
    if (prop.type === "checkbox") {
      value = prop.input.checked;
    } else {
      value = prop.input.value.trim();
    }
    data[prop.name] = value;
  });

  document.getElementById("save").disabled = true;

  chrome.storage.local.set({ config: data }, () => {
    // After saving, show the new settings
    useStoredSettings();
  });
}

// Display current settings from chrome.storage.local
function useStoredSettings() {
  chrome.storage.local.get("config", (container) => {
    properties.forEach((prop) => {
      if (prop.type === "checkbox") {
        if (container.config[prop.name]) {
          prop.input.checked = true;
        }
        return;
      }
      let value = container.config[prop.name];
      if (value === undefined || value === "") {
        prop.input.value = "";
        prop.input.style = "box-shadow: 0px 0px 2px 3px #ff0000;";
        prop.input.placeholder = "Required!";
      } else {
        prop.input.style = "";
        prop.input.value = value;
      }
    });
  });
}

// Set any unset properties to their defaults (if present)
function setDefaults(callback) {
  let data = {};
  chrome.storage.local.get("config", (container) => {
    properties.forEach((prop) => {
      let value = prop.default;
      if (container.config && container.config[prop.name]) {
        value = container.config[prop.name];
      }
      data[prop.name] = value;
    });
    chrome.storage.local.set({ config: data }, () => {
      // After saving, show the new settings
      callback();
    });
  });
}

function generatePage() {
  const inputs = document.getElementById("inputs");

  // Create Settings HTML
  properties.forEach((prop, index) => {
    const div = fromHtml(`
    <div style="padding: 5px 10px 10px 10px; ${
      index % 2 == 0 ? "background: #e2e2e2;" : ""
    }">
      <h2>${prop.title || ""}</h2>
      <label for="${prop.name}">${prop.desc}</label>
      <input id="${prop.name}" type="${prop.type}">
    </div>
  `);
    inputs.appendChild(div);

    prop.input = div.querySelector("input");
    prop.input.addEventListener("input", () => {
      document.getElementById("save").disabled = false;
    });
  });

  // Show existing settings
  useStoredSettings();

  // Hook up save button
  document.getElementById("save").addEventListener("click", save);
}

setDefaults(generatePage);
