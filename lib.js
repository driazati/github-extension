function empty() {}

function remove(element) {
  if (element && element.parentNode) {
    try {
      element.parentNode.removeChild(element);
    } catch (e) {}
  }
}

function insert_after(element, toInsert) {
  let next = element.nextSibling;
  if (next) {
    element.parentNode.insertBefore(toInsert, next);
  } else {
    element.parentNode.insert(toInsert);
  }
}

function build_dropdown(no_default, items, onchange) {
  let select = document.createElement("select");

  items.forEach((item) => {
    let option = document.createElement("option");
    option.setAttribute("value", item.value);
    if (item.selected) {
      option.setAttribute("selected", "selected");
    }
    option.appendChild(document.createTextNode(item.value));
    select.appendChild(option);
  });

  select.addEventListener("change", onchange);
  return select;
}

function build_btn(opts) {
  let btn = document.createElement("button");
  btn.appendChild(document.createTextNode(opts.text));
  btn.addEventListener("click", opts.click);
  btn.style.margin = "5px";
  return btn;
}

function find(list, filter) {
  for (let i = 0; i < list.length; i++) {
    if (filter(list[i])) {
      return list[i];
    }
  }
  return undefined;
}

function all_of(list, test) {
  for (let i = 0; i < list.length; i++) {
    if (!test(list[i])) {
      return false;
    }
  }
  return true;
}

function iterable_map(iterable, map) {
  let ret = [];

  for (let i = 0; i < iterable.length; i++) {
    ret.push(map(iterable[i], i, iterable));
  }

  return ret;
}

function escape_html(unsafe) {
  return (
    unsafe
      // .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  );
  // .replace(/"/g, "&quot;")
  // .replace(/'/g, "&#039;");
}

function request(url, opts) {
  const method = opts.method || "GET";
  const body = opts.body || {};
  const success = opts.success || empty;
  const error = opts.error || empty;

  const req = new XMLHttpRequest();
  req.open(method, url);
  req.setRequestHeader("Accept", "application/json");
  // req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

  req.onreadystatechange = function () {
    if (req.readyState == 4) {
      if (req.status >= 200 && req.status < 300) {
        success(req.responseText);
      } else {
        error(req);
      }
    }
  };

  req.onerror = function () {
    error();
  };

  req.send("");

  return req;
}

function featureFlag(name, callback) {
  chrome.storage.local.get("config", (container) => {
    if (container.config[name]) {
      callback();
    }
  });
}

// Call callback() often when it returns true, less if it returns false
function backoffInterval(args) {
  function clamp(x) {
    return +Math.min(Math.max(x, args.minWait), args.maxWait);
  }

  function check(wait) {
    let newWait = args.maxWait;
    if (args.callback()) {
      newWait = clamp(wait / args.factor);
    } else {
      newWait = clamp(wait * args.factor);
    }
    setTimeout(() => {
      check(newWait);
    }, newWait);
  }

  check(args.minWait);
}
