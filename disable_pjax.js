chrome.storage.local.get('config', (container) => {
	let secret_options = ("" + container.config['GitHub Token']).split('|');
	if (secret_options.some((item) => item === 'disablepjax')) {
		disable_pjax();
	}
});

function disable_pjax() {
	document.body.addEventListener('click', (event) => {
		let a = event.target.closest('a');
		if (a) {
			a.setAttribute('data-skip-pjax', true);
		}
	});
}

