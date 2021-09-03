featureFlag("Remove timeline events", () => {
  document.addEventListener("DOMContentLoaded", removeTimelineEvents);
  document.addEventListener("pjax:end", removeTimelineEvents);

  setInterval(removeTimelineEvents, 500);
});

function clearSelector(selector) {
  const events = Array.from(document.querySelectorAll(selector));
  for (const event of events) {
    remove(event);
  }
}

function removeTimelineEvents() {
  clearSelector("div.TimelineItem.js-targetable-element");
  clearSelector(
    "form.ajax-pagination-form.js-ajax-pagination.pagination-loader-container.text-center"
  );
}
