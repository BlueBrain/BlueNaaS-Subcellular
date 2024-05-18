import requests
import os
from .logger import get_logger

URL = os.getenv("API_URL")
# URL = "http://api:8001"

L = get_logger(__name__)
L.debug('URL')

def fetch_model(model_id: str, user_id: str):
    model_r = requests.get(f"{URL}/model-detail/{model_id}?user_id={user_id}")
    L.debug(model_r.status_code)
    L.debug(model_r.json())


    if model_r.status_code != 200:
        raise ConnectionError("Can't reach api")

    return model_r.json()
