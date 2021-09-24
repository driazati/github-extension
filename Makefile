zip:
	git ls-files | grep -v 'images/' | grep -v '.gitignore' | xargs zip extension.zip