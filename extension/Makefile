.PHONY: build clean

build: airports.json

airports.json: scripts/build-airports.js
	node scripts/build-airports.js

clean:
	rm -f airports.json
