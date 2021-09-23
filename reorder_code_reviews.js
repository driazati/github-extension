featureFlag("Sort generated code review blocks", () => {
  // document.addEventListener("DOMContentLoaded", sortCodeReviewBlocks);
  // document.addEventListener("pjax:end", sortCodeReviewBlocks);

  // setInterval(sortCodeReviewBlocks, 500);
});

function isGenerated(el) {
  return el.querySelector("div.js-diff-load-container");
}

function sortCodeReviewBlocks() {
  const parent = document.querySelectorAll("div.js-diff-progressive-container");

  let shouldReorder = false;
  let sawGenerated = false;
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (isGenerated(child)) {
      sawGenerated = true;
    } else if (sawGenerated) {
      shouldReorder = true;
      break;
    }
  }

  if (shouldReorder) {
    let toMove = [];
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      if (isGenerated(child)) {
        toMove.push(child);
        // remove(child);
        // parent.appendChild(child);
      }
    }

    for (const el of toMove) {
      remove(el);
      // parent.appendChild(el);
      console.log(el.querySelector("a.Link--primary").textContent);
    }
    for (const el of toMove) {
      // remove(el);
      parent.appendChild(el);
      // console.log(el.querySelector("a.Link--primary").textContent);
    }
  }
}
