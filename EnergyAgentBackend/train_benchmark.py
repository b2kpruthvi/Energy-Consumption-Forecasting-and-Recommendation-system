import pandas as pd
import pickle
from sklearn.ensemble import RandomForestRegressor
# Import the helper functions from your main app.py
from app import detect_dayfirst, normalize_columns # <-- IMPORT NORMALIZE_COLUMNS

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

# --- THIS IS THE FIX ---
print("Normalizing column names...")
df = normalize_columns(df)
# --- END OF FIX ---

print("Parsing dates...")
# 1. Detect and parse the date column
is_dayfirst = detect_dayfirst(df["Date"])
df["Date"] = pd.to_datetime(df["Date"], dayfirst=is_dayfirst, errors="coerce")
df = df.dropna(subset=["Date"])

# 2. Set the 'Date' column as the index
df = df.set_index("Date").sort_index()

# 3. Fill any gaps in the 1000-day file
df = df.resample("D").asfreq().ffill().bfill()


print("Creating benchmark features...")

# --- Feature Engineering for Benchmark Model ---
df['Temperature'] = pd.to_numeric(df['Temperature'], errors='coerce').ffill()
df['Temperature'] = df['Temperature'].fillna(25.0) # Fill any remaining NaNs
df['day_of_week'] = df.index.dayofweek
df['month'] = df.index.month
df['day_of_year'] = df.index.dayofyear
# --- End of Feature Engineering ---


# Define Features (X) and Targets (y)
FEATURES = ['day_of_week', 'month', 'day_of_year', 'Temperature']
TARGET_COLS = [col for col in df.columns if col.endswith('_Units')] # <-- This will work now

if not TARGET_COLS:
    print("--- ERROR ---")
    print("Could not find any appliance columns ending in '_Units' (e.g., 'AC_Units').")
    print("Please check your normalize_columns function and CSV file.")
    print("-------------")
    exit()

print(f"Found {len(TARGET_COLS)} appliance targets: {TARGET_COLS}")

# Drop any rows that still have missing data
df = df.dropna(subset=FEATURES + TARGET_COLS)

X = df[FEATURES]
y = df[TARGET_COLS]

print("Training appliance benchmark model (this may take a minute)...")
# A Random Forest is great at multi-output regression
appliance_model = RandomForestRegressor(
    n_estimators=100,     # 100 trees is fast and effective
    random_state=42,
    n_jobs=-1
)

appliance_model.fit(X, y)

print("Saving model to appliance_model.pkl...")
# Save the trained model to a file
with open('appliance_model.pkl', 'wb') as f:
    pickle.dump(appliance_model, f)

print("Done. You can now restart your Flask app.")