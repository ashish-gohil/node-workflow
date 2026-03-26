import torch
import pandas as pd

from model import StockTransformer
from features import process_features

# -------------------------------
# CONFIG
# -------------------------------

MODEL_PATH = "model.pt"
WINDOW_SIZE = 30


# -------------------------------
# LOAD MODEL (ONLY ONCE)
# -------------------------------

def load_model(input_dim):
    """
    Loads trained model from disk.
    """

    model = StockTransformer(input_dim=input_dim)

    model.load_state_dict(torch.load(MODEL_PATH, map_location=torch.device("cpu")))
    model.eval()

    return model


# -------------------------------
# PREPARE INPUT
# -------------------------------

def prepare_input(df):
    """
    Converts raw dataframe → model input tensor
    """

    # Apply full feature pipeline
    df = process_features(df)

    if len(df) < WINDOW_SIZE:
        raise ValueError("Not enough data for prediction")

    # Take last N days
    df = df.tail(WINDOW_SIZE)

    # Convert to tensor
    x = torch.tensor(df.values, dtype=torch.float32)

    # Add batch dimension → (1, window, features)
    x = x.unsqueeze(0)

    return x, df.shape[1]


# -------------------------------
# PREDICT FUNCTION
# -------------------------------

def predict(df):
    """
    Main prediction function.

    Input:
        df → raw OHLC dataframe

    Output:
        dict → direction, confidence, return
    """

    # Prepare input
    x, input_dim = prepare_input(df)

    # Load model
    model = load_model(input_dim)

    with torch.no_grad():

        dir_logits, ret_pred = model(x)

        # Convert logits → probabilities
        probs = torch.softmax(dir_logits, dim=1)

        confidence = probs.max().item()
        direction = probs.argmax().item()

        expected_return = ret_pred.item()

    return {
        "direction": "UP" if direction == 1 else "DOWN",
        "confidence": round(confidence, 4),
        "expected_return": round(expected_return, 4)
    }