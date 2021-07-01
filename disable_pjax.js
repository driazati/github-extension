featureFlag("Disable pjax", () => {
  document.body.addEventListener("click", (event) => {
    let a = event.target.closest("a");
    if (a) {
      a.setAttribute("data-skip-pjax", true);
    }
  });
});
