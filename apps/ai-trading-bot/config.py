from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    KITE_API_KEY = os.getenv("KITE_API_KEY")
    KITE_API_SECRET = os.getenv("KITE_API_SECRET")
    REQUEST_TOKEN = os.getenv("REQUEST_TOKEN")

    MODEL_PATH = os.getenv("MODEL_PATH", "model.pt")
    ENV = os.getenv("ENV", "development")
    UPSTOX_ACCESS_TOKEN = os.getenv("UPSTOX_ACCESS_TOKEN")

settings = Settings()