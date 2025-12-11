# evaluate_models.py
import argparse
import pickle
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.metrics import mean_absolute_error, mean_squared_error
from math import sqrt

# Import helper functions from your app.py (assumes script runs in same project)
from app import normalize_columns, detect_dayfirst, create_features_with_weather

def mape(y_true, y_pred):
    y_true = np.array(y_true, dtype=float)
    y_pred = np.array(y_pred, dtype=float)
    # avoid division by zero
    mask = y_true != 0
    if not mask.any():
        return np.nan
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100

def load_and_prepare(csv_path):
    df = pd.read_csv(csv_path)
    df = normalize_columns(df)
    if "Date" not in df.columns:
        raise ValueError("CSV must contain a 'Date' column.")
    is_dayfirst = detect_dayfirst(df["Date"])
    df["Date"] = pd.to_datetime(df["Date"], dayfirst=is_dayfirst, errors="coerce")
    df = df.dropna(subset=["Date"]).set_index("Date").sort_index()
    # ensure daily frequency
    df = df.resample("D").asfreq().ffill().bfill()
    # ensure Temperature present (if not, fill default)
    if "Temperature" not in df.columns:
        df["Temperature"] = 25.0
    else:
        df["Temperature"] = pd.to_numeric(df["Temperature"], errors="coerce").ffill().fillna(25.0)
    return df

def prepare_total_features(df):
    # create features (this function expects a DataFrame indexed by Date with 'Units' column present)
    df_ml = create_features_with_weather(df)
    FEATURES = ['day_of_week', 'month', 'day_of_year', 'lag_1', 'lag_7', 'rolling_mean_7', 'Temperature']
    TARGET = 'Units'
    if TARGET not in df_ml.columns:
        raise ValueError("'Units' column not found in processed dataframe.")
    X = df_ml[FEATURES]
    y = df_ml[TARGET]
    return X, y

def prepare_appliance_features(df):
    # Features for appliance model (day_of_week, month, day_of_year, Temperature)
    df_local = df.copy()
    df_local['day_of_week'] = df_local.index.dayofweek
    df_local['month'] = df_local.index.month
    df_local['day_of_year'] = df_local.index.dayofyear
    FEATURES = ['day_of_week', 'month', 'day_of_year', 'Temperature']
    TARGET_COLS = [c for c in df_local.columns if c.endswith('_Units')]
    if not TARGET_COLS:
        raise ValueError("No appliance columns found ending with '_Units'.")
    # drop rows with NA in features or targets
    df_local = df_local.dropna(subset=FEATURES + TARGET_COLS)
    X = df_local[FEATURES]
    y = df_local[TARGET_COLS]
    return X, y, TARGET_COLS

def time_series_train_test_split(X, y, test_frac=0.2):
    n = len(X)
    if n < 10:
        raise ValueError("Not enough samples for train/test split (need >= 10).")
    split_at = int(n * (1 - test_frac))
    if split_at < 3:
        split_at = max(3, n - 1)
    X_train = X.iloc[:split_at]
    X_test = X.iloc[split_at:]
    y_train = y.iloc[:split_at]
    y_test = y.iloc[split_at:]
    return X_train, X_test, y_train, y_test

def evaluate_regression(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = sqrt(mean_squared_error(y_true, y_pred))
    mape_val = mape(y_true, y_pred)
    return {"MAE": round(mae,4), "RMSE": round(rmse,4), "MAPE(%)": (round(mape_val,4) if not np.isnan(mape_val) else None)}

def main(args):
    print("Loading CSV and preparing data...")
    df = load_and_prepare(args.csv)

    # ---------- Total energy (XGBoost) evaluation ----------
    try:
        X_tot, y_tot = prepare_total_features(df)
        X_tr, X_te, y_tr, y_te = time_series_train_test_split(X_tot, y_tot, test_frac=args.test_frac)
    except Exception as e:
        print(f"[TOTAL] Preparation error: {e}")
        X_tr = X_te = y_tr = y_te = None

    if X_tr is not None:
        print("Loading base model...")
        with open(args.base, "rb") as f:
            base_model = pickle.load(f)
        print("Cloning and fine-tuning model on user training data...")
        model = clone(base_model)
        model.fit(X_tr, y_tr)
        print("Predicting on test set...")
        preds = model.predict(X_te)
        total_metrics = evaluate_regression(y_te, preds)
        print("\n=== Total Energy Forecast Metrics (XGBoost, test set) ===")
        for k,v in total_metrics.items():
            print(f"{k}: {v}")

    # ---------- Appliance benchmark (RandomForest) evaluation ----------
    try:
        X_app, y_app, appliance_cols = prepare_appliance_features(df)
        X_tr_a, X_te_a, y_tr_a, y_te_a = time_series_train_test_split(X_app, y_app, test_frac=args.test_frac)
    except Exception as e:
        print(f"[APPLIANCE] Preparation error: {e}")
        X_tr_a = X_te_a = y_tr_a = y_te_a = None

    if X_tr_a is not None:
        print("\nLoading appliance benchmark model...")
        with open(args.appliance, "rb") as f:
            app_model = pickle.load(f)
        # If the model supports fit (retraining) and you want to fine-tune, uncomment next lines:
        # print("Optionally fine-tuning appliance model on training data...")
        # app_model.fit(X_tr_a, y_tr_a)
        print("Predicting appliance outputs on test set...")
        preds_app = app_model.predict(X_te_a)
        # preds_app is (n_samples, n_targets)
        print("\n=== Appliance-level Metrics (per appliance) ===")
        overall = {}
        for idx, col in enumerate(appliance_cols):
            y_true_col = y_te_a.iloc[:, idx].values
            y_pred_col = preds_app[:, idx]
            metrics = evaluate_regression(y_true_col, y_pred_col)
            overall[col] = metrics
            print(f"\n-- {col} --")
            for k,v in metrics.items():
                print(f"{k}: {v}")

        # Optional: aggregate metric across all appliances (mean MAE)
        maes = [overall[c]["MAE"] for c in overall]
        print(f"\nAggregate mean MAE across appliances: {round(np.mean(maes),4)}")

    print("\nEvaluation complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate forecasting & appliance benchmark models on user data CSV.")
    parser.add_argument("--csv", required=True, help="Path to user CSV (must contain Date, Units, and *_Units columns).")
    parser.add_argument("--base", default="base_model.pkl", help="Path to base XGBoost model pickle.")
    parser.add_argument("--appliance", default="appliance_model.pkl", help="Path to appliance RandomForest model pickle.")
    parser.add_argument("--test_frac", type=float, default=0.2, help="Fraction of data to use as test set (time-series split).")
    args = parser.parse_args()
    main(args)
