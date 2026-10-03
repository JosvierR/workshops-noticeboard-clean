.PHONY: install test build up down logs ps smoke verify clean

install:
	python -m pip install -r backend/requirements-dev.txt
	npm --prefix frontend ci

test:
	cd backend && python -m pytest -v

build:
	npm --prefix frontend ci
	npm --prefix frontend run build
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs --tail=200

ps:
	docker compose ps

smoke:
	bash scripts/smoke_test.sh

verify: test build
	docker compose config
	docker compose up -d
	docker compose ps
	bash scripts/smoke_test.sh
	bash scripts/persistence_test.sh

clean:
	docker compose down --remove-orphans
