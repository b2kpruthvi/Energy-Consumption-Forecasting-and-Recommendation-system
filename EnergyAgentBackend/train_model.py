import pandas as pd
import pickle
from xgboost import XGBRegressor
# Import the helper functions from your main app.py
from app import create_features_with_weather, detect_dayfirst

print("Loading standard dataset...")
# Load your 1000-day CSV file
try:
    df = pd.read_csv(r"C:\Users\pruth\OneDrive\Desktop\Project\karnataka_energy_2018to2024.csv")
except FileNotFoundError:
    print("--- ERROR ---")
    print(r"File not found: C:\Users\pruth\OneDrive\Desktop\Project\karnataka_energy_2018to2024.csv")
    print("Please check the path.")
    print("-------------")
    exit()


if "Date" not in df.columns:
    print("--- ERROR ---")
    print("Your 1000-day dataset must have a 'Date' column.")
    print("-------------")
    exit()

print("Parsing dates...")
is_dayfirst = detect_dayfirst(df["Date"])
df["Date"] = pd.to_datetime(df["Date"], dayfirst=is_dayfirst, errors="coerce")
df = df.dropna(subset=["Date"])
df = df.set_index("Date").sort_index()
df = df.resample("D").asfreq().ffill().bfill()


print("Creating features...")
df_ml = create_features_with_weather(df)

FEATURES = ['day_of_week', 'month', 'day_of_year', 'lag_1', 'lag_7', 'rolling_mean_7', 'Temperature']
TARGET = 'Units'

X = df_ml[FEATURES]
y = df_ml[TARGET]

print("Training base model (this may take a minute)...")

# --- THIS IS THE FIX ---
# We are using the "honest" regularized settings
# to prevent the base model from overfitting.
base_model = XGBRegressor(
    n_estimators=100,     # Fewer trees
    learning_rate=0.1,    # A standard, stable learning rate
    max_depth=3,          # SHALLOW trees (can't memorize)
    objective='reg:squarederror',
    random_state=42,
    n_jobs=-1
)
# --- END OF FIX ---

base_model.fit(X, y)

print("Saving model to base_model.pkl...")
# Save the trained model to a file
with open('base_model.pkl', 'wb') as f:
    pickle.dump(base_model, f)

print("Done. You can now restart your Flask app.")