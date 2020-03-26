IMAGE=daimor/blocksexplorer

.PHONY: clean cache iris web

build: clean web

web:
	cd web && npm ci && npm run build:prod

clean:
	rm -rf web/build

cache:
	docker build -t $(IMAGE):cache .
	docker push $(IMAGE):cache

iris:
	docker build -f Dockerfile.iris -t $(IMAGE):iris .
	docker push $(IMAGE):iris
