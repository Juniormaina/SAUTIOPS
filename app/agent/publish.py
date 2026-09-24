import json
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()
CONFIG_PATH = Path(__file__).with_name("sautiops.json")


def required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def main() -> None:
    api_key = required("ASSEMBLYAI_API_KEY")
    api_url = required("SAUTIOPS_PUBLIC_URL").rstrip("/")
    tool_token = required("TOOL_BEARER_TOKEN")

    if not api_url.startswith("https://"):
        raise SystemExit("SAUTIOPS_PUBLIC_URL must be a public HTTPS URL.")

    raw = CONFIG_PATH.read_text(encoding="utf-8")
    raw = raw.replace("${SAUTIOPS_PUBLIC_URL}", api_url)
    raw = raw.replace("${TOOL_BEARER_TOKEN}", tool_token)
    config = json.loads(raw)

    agent_id = os.getenv("ASSEMBLYAI_AGENT_ID")
    method = "PUT" if agent_id else "POST"
    url = (
        f"https://agents.assemblyai.com/v1/agents/{agent_id}"
        if agent_id
        else "https://agents.assemblyai.com/v1/agents"
    )

    response = httpx.request(
        method,
        url,
        headers={"Authorization": api_key},
        json=config,
        timeout=30,
    )

    if response.is_error:
        raise SystemExit(
            f"Agent publish failed ({response.status_code}): {response.text}"
        )

    published = response.json()
    print(f"Agent published: {published['id']}")
    if not agent_id:
        print(f"Add this to .env:\nASSEMBLYAI_AGENT_ID={published['id']}")


if __name__ == "__main__":
    main()