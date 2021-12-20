// Converts GitHub's preview of job status for each commit from an icon with
// a popover to a progress bar with red/yellow/green for failed/pending/success

let GITHUB_OAUTH = undefined;
let TOKEN_ERROR =
  "Github OAuth Token is not set for Extra GitHub PR Info extension but 'Show build status' flag is on (visit the extension options to resolve this issue)";
let HIDE_BOT_COMMENT_COUNTS = undefined;

featureFlag("Show build status", () => {
  chrome.storage.local.get("config", (container) => {
    if (container.config === undefined) {
      alert(TOKEN_ERROR);
    }
    GITHUB_OAUTH = container.config["GitHub Token"];
    if (GITHUB_OAUTH === undefined) {
      alert(TOKEN_ERROR);
    }

    HIDE_BOT_COMMENT_COUNTS = container.config["Hide bot comment counts"];
    build_status_main();

    // Re-load the bars when the page is changed
    document.addEventListener("pjax:end", build_status_main);
  });
});

function fetch(url, formData) {
  return new Promise(function (resolve, reject) {
    let xhr = new XMLHttpRequest();

    xhr.open("POST", url);

    xhr.responseType = "";

    xhr.onerror = function () {
      reject(new Error("error"));
    };

    xhr.onload = function () {
      // do something with response
      let res = xhr.response;
      resolve(res);
    };

    // send request
    xhr.send(formData);
  });
}

// Get the pull request number from a PR element
function parse_num(row) {
  let id = row.getAttribute("id");
  let matches = id.match(/\d+/g);
  return matches[0];
}

function add_basic_bar(row, progress, bar_width, desc) {
  let build = row.querySelector(".commit-build-statuses a");
  let bar = progress_bar(progress, bar_width);
  bar.setAttribute("style", "margin-left: 4px");

  let container = row.querySelector("div.commit-build-statuses");
  if (desc) {
    let span = document.createElement("span");
    span.innerText = desc;
    container.appendChild(span);
  }
  container.appendChild(bar);
  return true;
}

function clear_bars(row) {
  let container = row.querySelector("div.commit-build-statuses");
  if (!container) {
    return false;
  }
  container.innerHTML = "";
}

// Using a row element and a GraphQL response for a pull request, add progress
// bars bucketed by categories of CI jobs
function add_bucketed_bars(row, pr, statuses) {
  // if (pr.number != 9769) {
  //   return;
  // }
  // console.log(statuses);
  // let status = pr["commits"]["nodes"][0]["commit"]["status"];
  // if (!status) {
  //   // No status found in response, so we can't do anything
  //   return;
  // }

  // Total size of bar
  let total_width = 100;
  // If there's only a few jobs for a bucket, use this width instead of making
  // it too small to see
  let min_width = 10;

  // let statuses = status["contexts"];

  // Set up known buckets to put PRs in
  // TODO: do this by avatar image or something instead of manually
  let bucketed_statuses = new Map();
  bucketed_statuses.set("continuous-integration/travis", {
    bar_width: 10,
    avatar: "",
    items: [],
  });
  bucketed_statuses.set("ci/", { bar_width: 10, avatar: "", items: [] });
  bucketed_statuses.set("pr/", { bar_width: 10, avatar: "", items: [] });
  bucketed_statuses.set("unknown", { bar_width: 10, avatar: "", items: [] });

  // Ignore _dr.ci since it's always a failure...
  let ignored_job_names = {
    "_dr.ci": true,
  };

  statuses.forEach((item) => {
    if (ignored_job_names[item.name]) {
      // Skip ignored items
      return;
    }
    for (let [bucket_name, bucket] of bucketed_statuses) {
      if (item.name.startsWith(bucket_name)) {
        bucket.items.push(item);
        if (bucket.avatar === "") {
          bucket.avatar = item.avatarUrl;
        }
        return;
      }
    }
    bucketed_statuses.get("unknown").items.push(item);
  });

  // Delete empty buckets
  let to_delete = [];
  for (let [bucket_name, bucket] of bucketed_statuses) {
    if (bucket.items.length == 0) {
      to_delete.push(bucket_name);
    }
  }
  to_delete.forEach((name) => {
    bucketed_statuses.delete(name);
  });

  // Count up all the jobs
  let total_items = 0;
  for (let [bucket_name, bucket] of bucketed_statuses) {
    total_items += bucket.items.length;
  }

  // Find bar width for each bucket as a proportion of the total
  for (let [bucket_name, bucket] of bucketed_statuses) {
    bucket.bar_width = Math.round(
      (bucket.items.length / total_items) * total_width
    );
    if (bucket.bar_width < min_width) {
      bucket.bar_width = min_width;
    }
  }

  // Create bars for each bucket
  let statuses_in_a_bar = 0;
  for (let [bucket_name, bucket] of bucketed_statuses) {
    bucket.progress = {
      good: bucket.items.reduce(
        (pre, curr) => (curr.status === "SUCCESS" ? ++pre : pre),
        0
      ),
      pending: bucket.items.reduce(
        (pre, curr) => (curr.status === "PENDING" ? ++pre : pre),
        0
      ),
      total: bucket.items.length,
    };
  }

  // Make bar SVG
  let bar = bucket_bar(bucketed_statuses);

  let failures = [];
  for (const status of statuses) {
    if (
      status.status !== "PENDING" &&
      status.status !== "SUCCESS" &&
      status.status !== "SKIPPED"
    ) {
      failures.push(status);
    }
  }

  const tooltip = fromHtml(`
    <div style="display: none; padding: 10px; position: absolute; left: 0px; top: 0px; border: 1px solid black; background-color: white;">
    </div>
  `);

  const table = document.createElement("table");
  for (const failure of failures) {
    let tableRow = document.createElement("tr");
    const cell = document.createElement("td");
    const anc = document.createElement("a");
    const span = document.createElement("span");
    span.innerText = "x";
    span.style["margin-right"] = "10px";
    span.style["font-weight"] = "bold";
    span.style["color"] = "red";
    anc.appendChild(span);
    anc.href = failure.url;
    const span2 = document.createElement("span");
    span2.textContent = failure.name;
    anc.appendChild(span2);
    cell.appendChild(anc);
    tableRow.appendChild(cell);
    table.appendChild(tableRow);
  }
  if (failures.length === 0) {
    let tableRow = document.createElement("tr");
    const cell = document.createElement("td");
    const span = document.createElement("span");
    span.innerText = "no failures!";
    span.style["margin-right"] = "10px";
    cell.appendChild(span);
    tableRow.appendChild(cell);
    table.appendChild(tableRow);
  }
  tooltip.appendChild(table);
  document.body.appendChild(tooltip);

  bar.onclick = (event) => {
    if (tooltip.style.display === "block") {
      tooltip.style.display = "none";
      return;
    }

    tooltip.style.left = `${event.pageX}px`;
    tooltip.style.top = `${event.pageY}px`;
    tooltip.style.display = "block";
  };

  // Add SVG to the page
  add_new_bar(row, bar);
}

function add_new_bar(row, bar) {
  let build = row.querySelector(".commit-build-statuses a");
  bar.setAttribute("style", "margin-left: 4px");

  let container = row.querySelector("div.commit-build-statuses");
  container.appendChild(bar);
  return true;
}

// Show a progress bar with different CIs in their own sections
function bucket_bar(statuses) {
  let red = "#cb2431";
  let yellow = "#dbab09";
  let green = "rgb(30, 206, 71)";
  let black = "rgb(0, 0, 0)";

  let svg = make_node("svg", { width: 150, height: 10 });

  let height = 10;
  let spacer = 1;

  let used_width = 0;
  let index = -1;
  for (let [bucket_name, bucket] of statuses) {
    index++;
    if (bucket.progress.total == 0) {
      // No tests for this bucket, skip
      continue;
    }
    let scaler = bucket.bar_width / bucket.progress.total;

    // red background
    let total = make_node("rect", {
      x: used_width,
      y: 0,
      width: bucket.bar_width,
      height: height,
    });
    total.style.fill = red;
    svg.appendChild(total);

    // yellow pending
    let pending_width =
      (bucket.progress.good + bucket.progress.pending) * scaler;
    let pending = make_node("rect", {
      x: used_width,
      y: 0,
      width: pending_width,
      height: height,
    });
    pending.style.fill = yellow;
    svg.appendChild(pending);

    // green goods
    let progress_width = bucket.progress.good * scaler;
    let progress_rect = make_node("rect", {
      x: used_width,
      y: 0,
      width: progress_width,
      height: height,
    });
    progress_rect.style.fill = green;
    svg.appendChild(progress_rect);

    // Spacer bar
    if (index < statuses.size - 1) {
      let spacer_rect = make_node("rect", {
        x: used_width + bucket.bar_width,
        y: 0,
        width: spacer,
        height: height,
      });
      spacer_rect.style.fill = black;
      svg.appendChild(spacer_rect);
    }

    used_width += bucket.bar_width + spacer;
  }

  return svg;
}

// Show the `diff --stat` results
function add_diff_stat(row, pr) {
  let small_text_div = row.querySelector("div.mt-1.text-small");

  let additions = parseInt(pr["additions"]);
  let deletions = parseInt(pr["deletions"]);
  let changedFiles = parseInt(pr["changedFiles"]);

  let text = `${changedFiles} files changed with ${additions} added lines and ${deletions} deleted lines`;
  const repo = pr.baseRepository;
  const url = `https://github.com/${repo.owner.login}/${repo.name}/pull/${pr.number}/files`;

  small_text_div.appendChild(
    fromHtml(`
    <div title="${text}" style="display: inline">
      <a href="${url}">
      <span style="color: green">+${additions}</span> / <span style="color: red">-${deletions}</span> (${changedFiles})
      </a>
    </div>
  `)
  );
}

// Add an emoji that states whether this PR has merge conflicts
function add_mergable(row, pr) {
  let small_text_div = row.querySelector("div.mt-1.text-small");

  let icon = null;
  if (pr.mergeable == "MERGEABLE") {
    // dont show anything if it's merge-able
  } else if (pr.mergeable == "CONFLICTING") {
    icon = "❗";
  } else {
    icon = "❔";
  }

  if (icon !== null) {
    small_text_div.appendChild(
      fromHtml(`
      <div title="Mergability status: ${pr.mergeable}" style="display: inline; margin-left: 2px; margin-right: 2px;">
        ${icon}
      </div>
    `)
    );
  }
}

function replace_review_status(row, pr) {
  let small_text_div = row.querySelector("div.mt-1.text-small");
  const status = small_text_div.children[1];
  let link = status.querySelector("a");
  if (!link) {
    return;
  }
  const text = link.innerText;
  let icon = text;
  if (text == "Draft") {
    icon = "🔜";
  } else if (text == "Review required") {
    icon = "🔸";
  } else if (text == "Changes requested") {
    icon = "❌";
  } else if (text == "Approved") {
    icon = "✅";
  }
  if (icon != text) {
    status.innerHTML = `<span title="Review status: ${text}" style="margin-left: 4px">${icon}</span>`;
  }
}

// Add the head ref branch of the pull request
function add_head_ref(row, pr) {
  let small_text_div = row.querySelector("div.mt-1.text-small");

  let text = "";
  if (pr["headRef"]) {
    text = pr["headRef"]["name"];
    const repo = pr.headRepository;
    const url = `https://github.com/${repo.owner.login}/${repo.name}/tree/${pr.headRef.name}`;

    small_text_div.appendChild(
      fromHtml(`
      <div style="display: inline; margin-right: 8px; margin-left: 6px; font-family: ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,Liberation Mono,monospace"><a style="color: #616161" href="${url}">${text}</a></div>
    `)
    );
  }
}

// Decrement the comment count by known-bot comments, delete if if 0
function hide_bot_comments(row, pr) {
  const commentsEl = row.querySelector(
    "a[aria-label$=comments] > span, a[aria-label$=comment] > span"
  );
  if (!commentsEl) {
    console.error(`Couldn't find comments for ${pr.number}`);
    return;
  }

  // Count up the bot comments in the PR by username
  let numBotComments = 0;
  const bots = {
    "facebook-github-bot": true,
    "pytorch-probot": true,
    codecov: true,
  };
  for (const comment of pr["comments"]["nodes"]) {
    const login = comment["author"]["login"];
    if (bots[login]) {
      numBotComments += 1;
    }
  }

  // Get the count from the page
  const numComments = parseInt(commentsEl.innerText);

  // Set the count of non-bot comments, delete the element if necessary
  const realComments = numComments - numBotComments;
  if (realComments === 0) {
    remove(commentsEl.parentNode);
  } else {
    commentsEl.innerText = realComments;
  }
}

// Parse the body for a link to a diff and add that if found
function add_phabricator_diff(row, pr) {
  let small_text_div = row.querySelector("div.mt-1.text-small");

  let a = document.createElement("a");

  let body = pr["bodyText"];
  let match = body.match(/D\d+/);
  if (!match) {
    return;
  }

  a.href = `https://our.internmc.facebook.com/intern/diff/${match}/`;
  a.innerText = match;
  a.style["margin-left"] = "6px";

  small_text_div.appendChild(a);
}

function mergeGHAandStatuses(rollup) {
  return rollup.contexts.nodes.map((x) => {
    if (x.__typename == "CheckRun") {
      let status = x.conclusion;
      if (x.conclusion === null) {
        status = "PENDING";
      }
      return {
        name: `${x.name}`,
        status: status,
        url: x.url,
      };
    } else {
      return {
        name: x.context,
        status: x.state,
        url: x.targetUrl,
      };
    }
  });
}

function build_status_main() {
  let rows = document.querySelectorAll(".js-issue-row");
  let builds = document.querySelectorAll(".commit-build-statuses a");

  let nums = [];
  for (let i = 0; i < rows.length; ++i) {
    nums.push(parse_num(rows[i]));
  }

  for (let i = 0; i < rows.length; ++i) {
    continue;
    let build = rows[i].querySelector(".commit-build-statuses a");
    if (!build) {
      continue;
    }

    // If the build is pending (i.e. it has the yellow circle icon), none of
    // the jobs have completed
    let is_pending = build.classList.contains("bg-pending");
    let span = document.createElement("span");
    let progress = parse_progress(build.getAttribute("aria-label"));
    if (!progress) {
      // Couldn't parse progress, give up
      continue;
    }
    if (is_pending) {
      progress.pending = progress.total;
    }
    clear_bars(rows[i]);

    if (progress.total > 0) {
      // Don't try to add a bar if there are no builds
      // add_basic_bar(rows[i], progress, 100);
    }

    // Make labels more pastel in color
    // TODO: delete this probably, seems to random to have here
    let labels = rows[i].querySelectorAll("a.IssueLabel");
    iterable_map(labels, (label) => {
      let new_color = label.style["background-color"]
        .replace(")", ", 0.5)")
        .replace("rgb", "rgba");
      label.style["background-color"] = new_color;
    });
  }

  if (!GITHUB_OAUTH) {
    // No auth, cant fetch from API
    console.error(
      "Couldn't fetch up to date progress bars (no GitHub OAuth token, add one in settings)"
    );
    return;
  }

  function show_pr_data(pr, row) {
    if (pr["commits"]["nodes"][0]["commit"]["status"]) {
      // If we got some new data, use that to make new bucketed bars
      clear_bars(row);
      add_bucketed_bars(row, pr);
    }
    if (pr.commits.nodes[0].commit.statusCheckRollup) {
      const rollup = pr.commits.nodes[0].commit.statusCheckRollup;
      const statuses = mergeGHAandStatuses(rollup);
      clear_bars(row);
      add_bucketed_bars(row, pr, statuses);
    }

    // Add some extra info about the PR
    add_mergable(row, pr);
    add_head_ref(row, pr);
    replace_review_status(row, pr);
    add_diff_stat(row, pr);
    add_phabricator_diff(row, pr);

    if (HIDE_BOT_COMMENT_COUNTS) {
      hide_bot_comments(row, pr);
    }
  }

  function pr_id(user, repo, pr) {
    return `${user}_${repo}_${pr}`;
  }

  if (window.location.href.includes("github.com/pulls")) {
    // all of a user's prs
    let prs = [];
    let pr_to_row = {};
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      let combo = row
        .querySelector(".v-align-middle.muted-link.h4.pr-1")
        .innerText.split("/");
      prs.push({
        num: parse_num(row),
        user: combo[0],
        repo: combo[1],
      });
      pr_to_row[pr_id(combo[0], combo[1], parse_num(row))] = row;
    }
    let url = "https://api.github.com/graphql";
    let query = build_graphql_query_for_many_repos(prs);

    status_request(url, {
      body: JSON.stringify({ query }),
      success: (data) => {
        if (!data || !data["data"]) {
          // No data to show
          return;
        }
        let repos = data["data"];
        let prs_and_id = [];
        for (let repo in repos) {
          let prs = repos[repo];
          for (let pr in prs) {
            prs_and_id.push({
              id: pr_id(
                repo.split("_")[0],
                repo.split("_")[1],
                pr.replace("p", "")
              ),
              pr: prs[pr],
            });
          }
        }

        for (let pr_and_id of prs_and_id) {
          let row = pr_to_row[pr_and_id["id"]];
          show_pr_data(pr_and_id["pr"], row);
        }
      },
    });
  } else {
    // repo specific PRs
    fetch_statuses(nums, (data) => {
      if (!data || !data["data"] || !data["data"]["repository"]) {
        // No data to show
        return;
      }

      // Got actual data from GitHub API, show real bars
      let results = data["data"]["repository"];
      for (let i = 0; i < rows.length; ++i) {
        show_pr_data(results["p" + nums[i]], rows[i]);
      }
    });
  }
}

function parse_progress(text) {
  // Azure pipelines jobs make it just say "Queued"
  if (text == "Queued") {
    return {
      good: 0,
      pending: 1,
      total: 1,
    };
  }

  // Should be like "11 / 20 checks OK"
  let result = text.match(/(\d+)/gm);
  if (!result) {
    return undefined;
  }
  return {
    good: parseInt(result[0]),
    pending: 0, // no pending yet
    total: parseInt(result[1]),
  };
}

function progress_bar(progress, bar_width) {
  let red = "#cb2431";
  let yellow = "#dbab09";
  let green = "rgb(30, 206, 71)";

  let svg = make_node("svg", { width: bar_width, height: 10 });
  let scaler = bar_width / progress.total;

  // red background
  let total = make_node("rect", { x: 0, y: 0, width: bar_width, height: 10 });
  total.style.fill = red;
  svg.appendChild(total);

  // yellow pending
  let pending_width = (progress.good + progress.pending) * scaler;
  let pending = make_node("rect", {
    x: 0,
    y: 0,
    width: pending_width,
    height: 10,
  });
  pending.style.fill = yellow;
  svg.appendChild(pending);

  // green progress
  let progress_width = progress.good * scaler;
  let progress_rect = make_node("rect", {
    x: 0,
    y: 0,
    width: progress_width,
    height: 10,
  });
  progress_rect.style.fill = green;
  svg.appendChild(progress_rect);

  return svg;
}

function make_node(type, attrs) {
  let node = document.createElementNS("http://www.w3.org/2000/svg", type);
  for (var attr in attrs) {
    node.setAttributeNS(null, attr, attrs[attr]);
  }
  return node;
}

function fetch_statuses(numbers, callback) {
  let url = "https://api.github.com/graphql";
  let query = build_graphql_query(numbers);
  status_request(url, {
    body: JSON.stringify({ query }),
    success: callback,
  });
}

// Get a GraphQL query that gets some properties for each of the PR numbers
// provided
function build_graphql_query_for_many_repos(prs) {
  function get_pr_query(num) {
    let query = `p${num}:pullRequest(number: ${num}) {`;
    query += "id" + "\n";
    query += "number" + "\n";
    query += "title" + "\n";
    query += "deletions" + "\n";
    query += "additions" + "\n";
    query += "bodyText" + "\n";
    query += "changedFiles" + "\n";
    query += "mergeable" + "\n";
    query += "headRef {\nname\n}" + "\n";
    if (HIDE_BOT_COMMENT_COUNTS) {
      query += "comments(first:100) {nodes {author {login} } }\n";
    }
    query +=
      "commits(last: 1) {nodes {commit {status {contexts {state\ncontext\navatarUrl\ntargetUrl\n}}}}}" +
      "\n";
    query += "}";
    return query;
  }

  prs_by_repo_and_user = {};
  for (let pr of prs) {
    let user = pr["user"];
    let repo = pr["repo"];
    if (!prs_by_repo_and_user[user]) {
      prs_by_repo_and_user[user] = {};
      prs_by_repo_and_user[user][repo] = [];
    }
    if (!prs_by_repo_and_user[user][repo]) {
      prs_by_repo_and_user[user][repo] = [];
    }
    prs_by_repo_and_user[user][repo].push(pr["num"]);
  }

  let query = "{";
  for (let user in prs_by_repo_and_user) {
    for (let repo in prs_by_repo_and_user[user]) {
      let repo_id = user + "_" + repo;
      query += `${repo_id}:repository(owner: "${user}", name: "${repo}") {\n`;
      for (let pr of prs_by_repo_and_user[user][repo]) {
        query += get_pr_query(pr);
      }
      query += "}\n";
    }
  }
  query += "\n}";
  return query;
}

// Get a GraphQL query that gets some properties for each of the PR numbers
// provided
function build_graphql_query(numbers) {
  let pull_requests = numbers.map((num) => {
    let query = `p${num}:pullRequest(number: ${num}) {`;
    query += "id" + "\n";
    query += "number" + "\n";
    query += "title" + "\n";
    query += "deletions" + "\n";
    query += "additions" + "\n";
    query += "bodyText" + "\n";
    query += "changedFiles" + "\n";
    query += "mergeable" + "\n";
    query += "headRef {\nname\n}" + "\n";
    query += "baseRepository {\n name\n owner {\n login } }";
    query += "headRepository {\n name\n owner {\n login } }";
    if (HIDE_BOT_COMMENT_COUNTS) {
      query += "comments(first:100) {nodes {author {login} } }\n";
    }
    // query +=
    //   "commits(last: 1) {nodes {commit {status {contexts {state\ncontext\navatarUrl\ntargetUrl\n}}}}}" +
    //   "\n";

    query += `
    commits(last: 1) { nodes { commit {
      statusCheckRollup {
        contexts(last:100) {
          nodes {
            __typename
            ... on CheckRun {
              name
              conclusion
              url
              checkSuite {
                workflowRun {
                  workflow {
                    name
                  }
                }
              }
            }
            ... on StatusContext {
              context
              state
              targetUrl
            }
          }
        }
      }
    }}}   
    `;
    query += "}";
    return query;
  });

  // Parse username + repo from URL
  let url = window.location.href;
  let result = url.match(/github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)/);
  let user = result[1];
  let repo = result[2];

  let query = `{ repository(owner: "${user}", name: "${repo}") {`;
  query += pull_requests.join("\n");
  query += "} }";
  return query;
}

function remove(element) {
  if (element && element.parentNode) {
    try {
      element.parentNode.removeChild(element);
    } catch (e) {}
  }
}

function status_request(url, opts) {
  const method = opts.method || "POST";
  const body = opts.body || {};
  const success = opts.success || empty;
  const error = opts.error || empty;

  const req = new XMLHttpRequest();

  req.open(method, url);
  const accept = opts.accept || "application/json";
  req.setRequestHeader("Accept", accept);
  req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  if (GITHUB_OAUTH) {
    req.setRequestHeader("Authorization", "bearer " + GITHUB_OAUTH);
  }

  req.onreadystatechange = function () {
    if (req.readyState == 4) {
      if (req.status >= 200 && req.status < 300) {
        success(JSON.parse(req.responseText));
      } else {
        error(req);
      }
    }
  };

  req.onerror = function () {
    error();
  };

  if (body) {
    req.send(body);
  } else {
    req.send();
  }
}
