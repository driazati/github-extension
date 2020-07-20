// chrome imposes a max message size of 64 MB
// TODO: chunk up responses so they still get sent
const MAX_MESSAGE_SIZE = 30 * 1024 * 1024;

chrome.runtime.onMessage.addListener(
function(request, sender, sendResponse) {
	if (request.ci_viewer_url) {
		console.log(fetch);
	  fetch(request.ci_viewer_url, request.options)
	      .then(response => {
	      		response.text().then(x => {
	      			if (x.length <= MAX_MESSAGE_SIZE) {
	      				sendResponse(x);
	      				return;
	      			}

	      			// Cut the response off since it's too big
	      			let overage = x.length - MAX_MESSAGE_SIZE;
	      			let response = "!!!! response is too long and has been truncated !!!\n" + x.slice(overage);
	      			sendResponse(response);
	      		});
	      	})
	      .catch(error => { console.log(error)});
	  return true;
	}
});