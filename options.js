let properties = [
	{
		'name': 'GitHub Token',
		'title': 'GitHub OAuth Token <a href="https://github.com/settings/tokens">(get one here, add "repo" permissions)</a>',
		'desc': 'This is needed to make requests to the GitHub API'
	},
];

// Save settings to chrome.storage.local
function save() {
	let data = {};

	properties.forEach((prop) => {
		data[prop.name] = prop.input.value.trim();
	});

	document.getElementById('save').disabled = true;

	chrome.storage.local.set({'config': data}, () => {
		// After saving, show the new settings
		show_info();
	});
}

// Display current settings from chrome.storage.local
function show_info() {
	chrome.storage.local.get('config', (container) => {
		properties.forEach((prop) => {
			let value = container.config[prop.name];
			if (value === undefined || value === '') {
				prop.input.value = '';
				prop.input.style = "box-shadow: 0px 0px 2px 3px #ff0000;";
				prop.input.placeholder = "Required!"
			} else {
				prop.input.style = "";
				prop.input.value = value;				
			}
		});
	});
}

// Set any unset properties to their defaults (if present)
function set_defaults(callback) {
	let data = {};
	chrome.storage.local.get('config', (container) => {
		properties.forEach((prop) => {
			let value = prop.default;
			if (container.config && container.config[prop.name]) {
				value = container.config[prop.name];
			}
			data[prop.name] = value;
		});
		chrome.storage.local.set({'config': data}, () => {
			// After saving, show the new settings
			callback();
		});
	});
}

function change() {
	document.getElementById('save').disabled = false;
}


function generate_page() {
	const inputs = document.getElementById('inputs');
	const grey = "#e0e0e0";

	// Create Settings HTML
	properties.forEach((prop, index) => {
		let div = document.createElement('div');
		let input_html = `<input id="${prop.name}">`;
		div.innerHTML = `<h2>${prop.title}</h2>${input_html}`;
		div.style = "padding: 5px 10px 10px 10px";
		inputs.appendChild(div);

		if (index % 2 == 0) {
			div.style.background = grey;
		}

		prop.input = div.querySelector('input');
		prop.input.addEventListener('input', change);
	});

	// Show existing settings
	show_info();

	// Hook up save button
	document.getElementById('save').addEventListener('click', save);
}

set_defaults(generate_page);



