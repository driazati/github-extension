// Gets rid of "This comment has been minimized" by expanding all of them
featureFlag("Unminimize comments", () => {
  function unminize_comments() {
    let comments = document
      .querySelectorAll("div.minimized-comment")
      .forEach(unminimize);
  }

  function unminimize(element) {
    let summary = element.querySelector("summary");
    summary.click();
    remove(summary);

    let content = element.querySelector("details div");
    content.style = "padding: 0px !important";
    remove(content.parentNode);
    element.appendChild(content);
  }

  document.addEventListener("DOMContentLoaded", unminize_comments);
  document.addEventListener("pjax:end", unminize_comments);
});
