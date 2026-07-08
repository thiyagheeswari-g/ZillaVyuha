import asyncio
from zillavyuha.agent import zillavyuha_workflow, app
from google.adk.runners import InMemoryRunner
from google.genai import types

async def main():
    runner = InMemoryRunner(app=app)
    msg = types.Content(role="user", parts=[types.Part(text="Run Pipeline")])
    session = await runner.session_service.get_session(app_name="zillavyuha", user_id="demo_user", session_id="test_session_id")
    if not session:
        session = await runner.session_service.create_session(app_name="zillavyuha", user_id="demo_user", session_id="test_session_id")
    
    session.state["uploaded_file_paths"] = ["sample_data/lab_availability.csv"]
    print("Running pipeline...")
    async for event in runner.run_async(user_id="demo_user", session_id="test_session_id", new_message=msg, state_delta={"uploaded_file_paths": ["sample_data/lab_availability.csv"]}):
        print("EVENT:", event.author)
    
    print("\nState after pipeline:")
    for k, v in session.state.items():
        print(k, type(v))

asyncio.run(main())
