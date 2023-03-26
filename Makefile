watch:
	npm ci
	jupyter labextension develop . --overwrite
	npm run build
	make -j watch-run watch-watch

watch-run:
	jupyter lab

watch-watch:
	sleep 10
	npm run watch
