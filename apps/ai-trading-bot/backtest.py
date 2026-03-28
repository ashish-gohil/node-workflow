
def backtest(model, dataset, threshold=0.6):

    capital = 100000
    wins = 0
    total = 0

    model.eval()

    for i in range(len(dataset)):
        x, _, _ = dataset[i]

        x = x.unsqueeze(0)

        dir_logits, ret_pred = model(x)

        probs = torch.softmax(dir_logits, dim=1)
        confidence = probs.max().item()
        direction = probs.argmax().item()

        if confidence < threshold:
            continue

        actual_ret = dataset.y_ret[i].item()

        total += 1

        if (direction == 1 and actual_ret > 0) or (direction == 0 and actual_ret < 0):
            wins += 1

        capital += capital * actual_ret * (1 if direction == 1 else -1)

    print("Final Capital:", capital)
    print("Accuracy:", wins / total if total else 0)



if __name__ == "__main__":

    import torch
    from model import StockTransformer
    from dataset import StockDataset

    # -------------------------------
    # 🔧 CONFIG
    # -------------------------------
    MODEL_PATH = "model.pth"
    DATA_PATH = "data.csv"

    # -------------------------------
    # 📊 LOAD DATASET
    # -------------------------------
    dataset = StockDataset(DATA_PATH)

    # -------------------------------
    # 🧠 LOAD MODEL
    # -------------------------------
    model = StockTransformer(
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
    backtest(model, dataset, threshold=0.6)