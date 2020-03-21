IMAGE=daimor/blocksexplorer

PHONY = cache iris

cache:
	docker build -t $(IMAGE):cache .
	docker push $(IMAGE):cache

iris:
	docker build -f Dockerfile.iris -t $(IMAGE):iris .
	docker push $(IMAGE):iris

default: cache iris
