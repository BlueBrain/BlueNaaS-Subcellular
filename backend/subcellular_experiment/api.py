import requests
import os

URL = os.getenv("API_URL")
# URL = "http://api:8001"


def fetch_model(model_id: str, user_id: str):
    model_r = requests.get(f"{URL}/model-detail/{model_id}?user_id={user_id}")

    if model_r.status_code != 200:
        raise ConnectionError("Can't reach api")

    return model_r.json()
