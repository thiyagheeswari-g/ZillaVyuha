install:
	uv sync

run:
	uv run python -m zillavyuha.fast_api_app

frontend:
	uv run python zillavyuha/frontend.py

playground:
	uv run adk web zillavyuha --host 127.0.0.1 --port 18081 --reload_agents

test:
	uv run pytest tests/ -v

deploy:
	agents-cli deploy --project $(PROJECT_ID) --region us-central1
