import torch
import torch.nn.functional as F
from utils.trading_v2 import generate_signal_v2


def backtest_v2(model, dataset, min_confidence=0.55):

    capital = 100000
    wins = 0
    total = 0

    strong_trades = 0
    strong_wins = 0

    model.eval()

    for i in range(len(dataset)):

        x, _, _ = dataset[i]
        x = x.unsqueeze(0)

        with torch.no_grad():
            dir_logits, ret_pred = model(x)

            probs = F.softmax(dir_logits, dim=1)

            confidence = probs.max().item()
            direction = probs.argmax().item()
            expected_return = ret_pred.item()

        # 🚫 Skip weak confidence
        if confidence < min_confidence:
            continue

        # 🔥 Use trading logic
        signal, strength = generate_signal_v2(
            direction,
            confidence,
            expected_return
        )

        # 🚫 Skip HOLD signals
        if signal == "HOLD":
            continue

        actual_ret = dataset.y_ret[i].item()

        total += 1

        # ✅ Check win
        is_win = (
            (signal == "BUY" and actual_ret > 0) or
            (signal == "SELL" and actual_ret < 0)
        )

        if is_win:
            wins += 1

        # 🔥 Track strong trades separately
        if strength == "STRONG":
            strong_trades += 1
            if is_win:
                strong_wins += 1

        # 💰 Capital update
        if signal == "BUY":
            capital += capital * actual_ret
        elif signal == "SELL":
            capital += capital * (-actual_ret)

    # 📊 RESULTS
    print("\n===== BACKTEST V2 RESULTS =====")
    print("Final Capital:", round(capital, 2))
    print("Total Trades:", total)

    if total > 0:
        print("Accuracy:", round(wins / total, 4))

    if strong_trades > 0:
        print("Strong Trade Accuracy:", round(strong_wins / strong_trades, 4))
        print("Strong Trades:", strong_trades)


if __name__ == "__main__":

    import torch
    from model_v2 import StockTransformerV2
    from dataset_v2 import StockDatasetV2

    # -------------------------------
    # 🔧 CONFIG
    # -------------------------------
    MODEL_PATH = "model_v2.pth"
    DATA_PATH = "data.csv"   # your dataset file

    # -------------------------------
    # 📊 LOAD DATASET
    # -------------------------------
    dataset = StockDatasetV2(DATA_PATH)

    # -------------------------------
    # 🧠 LOAD MODEL
    # -------------------------------
    model = StockTransformerV2(
        input_dim=dataset.X.shape[2],
        d_model=64,
        n_heads=4,
        n_layers=2
    )

    model.load_state_dict(torch.load(MODEL_PATH))
    model.eval()

    # -------------------------------
    # 🚀 RUN BACKTEST
    # -------------------------------
    backtest_v2(model, dataset, min_confidence=0.55)