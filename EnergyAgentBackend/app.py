# EnergyAgentBackend/app.py (updated: 2025-11-10)
import os
import io
import datetime
import warnings
import pmdarima as pm
import pandas as pd
import numpy as np

from flask import Flask, request, jsonify, current_app, make_response
from flask_cors import CORS

# DB / Auth
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    jwt_required as jwt_required_decorator,
    get_jwt_identity,
    JWTManager,
    verify_jwt_in_request,
)
# JWT exceptions
from jwt import ExpiredSignatureError, InvalidTokenError
# Add these with your other imports
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np
# ... (all your other imports)
import pmdarima as pm
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.preprocessing import StandardScaler

# ... (your other imports)
import requests
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import pickle

warnings.filterwarnings("ignore")

# -------------------- App + CORS --------------------
app = Flask(__name__)

CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "*"]}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Headers", "X-CSRFToken"],
    expose_headers=["Content-Type", "Authorization"],
)

# -------------------- DB config --------------------
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "energy_db")

app.config["SQLALCHEMY_DATABASE_URI"] = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "your-super-secret-random-string")

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# -------------------- Models --------------------
class User(db.Model):
    __tablename__ = "users"
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(10), nullable=False, default="user")
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    daily_data = db.relationship("DailyData", backref="owner", lazy=True)


class DailyData(db.Model):
    __tablename__ = "daily_data"
    data_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    Date = db.Column(db.Date, nullable=False)
    Temperature = db.Column(db.Float)
    Fan = db.Column(db.Float)
    Fan_Units = db.Column(db.Float)
    Refrigerator = db.Column(db.Float)
    Fridge_Units = db.Column(db.Float)
    AirConditioner = db.Column(db.Float)
    AC_Units = db.Column(db.Float)
    Bulb = db.Column(db.Float)
    Bulb_Units = db.Column(db.Float)
    Television = db.Column(db.Float)
    TV_Units = db.Column(db.Float)
    Monitor = db.Column(db.Float)
    Monitor_Units = db.Column(db.Float)
    MotorPump = db.Column(db.Float)
    Motor_Units = db.Column(db.Float)
    Month = db.Column(db.Integer)
    Units = db.Column(db.Float)
    Extra = db.Column(db.Float)
    TariffRate = db.Column(db.Float)
    ElectricityBill = db.Column(db.Float)
    __table_args__ = (db.UniqueConstraint("user_id", "Date", name="_user_date_uc"),)

# --- PASTE YOUR API KEY HERE ---
WEATHER_API_KEY = "1a71afaefc79449289695621251011" 
# -------------------------------

def get_future_weather(city, days):
    """
    Fetches the future weather forecast for a given city.
    """
    if WEATHER_API_KEY == "YOUR_API_KEY_HERE":
        current_app.logger.warning("Weather API key not set. Using dummy weather data.")
        # Return a list of dummy temperatures
        return [25.0] * days 

    try:
        # The free plan maxes out at 14 days.
        api_days = min(int(days), 14) 
        
        # Use api_days in the URL, not 'days'
        url = f"http://api.weatherapi.com/v1/forecast.json?key={WEATHER_API_KEY}&q={city}&days={api_days}&aqi=no&alerts=no"
        
        response = requests.get(url)
        response.raise_for_status() # Raises error if request failed
        data = response.json()
        
        # Extract the average temp for each forecast day
        future_temps = []
        for day_data in data['forecast']['forecastday']:
            future_temps.append(day_data['day']['avgtemp_c'])
        
        # If we asked for more days than the API gives, fill the rest
        # (This will now fill days 15-30)
        while len(future_temps) < days:
            future_temps.append(future_temps[-1]) # Repeat last day's temp
            
        return future_temps[:days] # Ensure we only return the number of days requested
        
    except Exception as e:
        current_app.logger.error(f"Error fetching future weather: {e}")
        # Fallback to dummy data on error
        return [25.0] * days

def create_features_with_weather(df):
    """
    Creates time series features from a dataframe, now including Temperature.
    """
    df_new = df.copy()
    # Ensure Temperature is numeric and forward-fill any missing values
    df_new['Temperature'] = pd.to_numeric(df_new['Temperature'], errors='coerce').ffill()
    
    # If temp is still all NaN, fill with a default
    if df_new['Temperature'].isnull().all():
        df_new['Temperature'] = 25.0 # Default to 25 degrees
    
    df_new['day_of_week'] = df_new.index.dayofweek
    df_new['month'] = df_new.index.month
    df_new['day_of_year'] = df_new.index.dayofyear
    df_new['lag_1'] = df_new['Units'].shift(1)
    df_new['lag_7'] = df_new['Units'].shift(7)
    df_new['rolling_mean_7'] = df_new['Units'].shift(1).rolling(window=7).mean()
    
    # Drop rows with NaN values created by shifts/rolling
    df_new = df_new.dropna() 
    return df_new

def detect_dayfirst(date_series):
    """
    Scans a series of date strings to detect if the format is dd-mm-yyyy.
    """
    # Try to parse as default (mm-dd-yyyy)
    first_pass = pd.to_datetime(date_series, dayfirst=False, errors='coerce')
    # Try to parse as dayfirst=True (dd-mm-yyyy)
    second_pass = pd.to_datetime(date_series, dayfirst=True, errors='coerce')

    # Count errors (NaT = Not a Time)
    first_pass_errors = first_pass.isnull().sum()
    second_pass_errors = second_pass.isnull().sum()

    # If dayfirst=True has *fewer* errors, it's the right one.
    if second_pass_errors < first_pass_errors:
        return True
    else:
        # Otherwise, stick to the default mm-dd-yyyy
        return False
    
# --- END OF HELPER FUNCTIONS ---

# -------------------- Simple CSV storage (fallback) --------------------
UPLOAD_FOLDER = "data"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
LATEST_UPLOAD_PATH = os.path.join(UPLOAD_FOLDER, "latest_upload.csv")
global_df = None


# -------------------- Helpers --------------------
def get_float_or_none(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def get_int_or_none(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    # 1. Basic cleanup (same as before)
    df.columns = df.columns.str.strip()
    df.columns = df.columns.str.replace(r" ?\((.*?)\)", r"_\1", regex=True)
    df.columns = df.columns.str.replace(" ", "_")
    df.columns = df.columns.str.replace("-", "_")

    # 2. Define the EXACT column names your database model expects
    # We map lowercase versions to the correct PascalCase name.
    expected_cols_map = {
        "temperature": "Temperature",
        "fan": "Fan",
        "fan_units": "Fan_Units",
        "refrigerator": "Refrigerator",
        "fridge_units": "Fridge_Units",
        "airconditioner": "AirConditioner",
        "ac_units": "AC_Units",
        "bulb": "Bulb",
        "bulb_units": "Bulb_Units",
        "television": "Television",
        "tv_units": "TV_Units",
        "monitor": "Monitor",
        "monitor_units": "Monitor_Units",
        "motorpump": "MotorPump",
        "motor_units": "Motor_Units",
        "month": "Month",
        "units": "Units",
        "extra": "Extra",
        "tariffrate": "TariffRate",
        "electricitybill": "ElectricityBill",
        "date": "Date",
        
        # 3. Add common aliases from your old function
        "unit": "Units",
        "energy": "Units",
        "energy_kwh": "Units",
        "consumption": "Units",
        "kwh": "Units",
        "timestamp": "Date",
        "time": "Date",
        
        # 4. Add other likely aliases
        "fridge": "Refrigerator",
        "ac": "AirConditioner"
    }

    colmap = {}
    for c in df.columns:
        # Find the correct case-sensitive name by checking the lowercase version
        expected_name = expected_cols_map.get(c.lower())
        
        # If we found a match, map this column (e.g., "fan_units") to "Fan_Units"
        if expected_name:
            colmap[c] = expected_name
    
    if colmap:
        df = df.rename(columns=colmap)
        
    return df


def read_latest_uploaded_df():
    global global_df
    if global_df is not None:
        return global_df
    if os.path.exists(LATEST_UPLOAD_PATH):
        try:
            df = pd.read_csv(LATEST_UPLOAD_PATH)
            df = normalize_columns(df)
            if "Date" in df.columns:
                df["Date"] = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")
                df = df.dropna(subset=["Date"])
                df = df.sort_values("Date")
            global_df = df
            return df
        except Exception:
            return None
    return None


def get_user_data_as_dataframe():
    try:
        user_id = int(get_jwt_identity())
        user_data = DailyData.query.filter_by(user_id=user_id).all()
        current_app.logger.info(f"--- FORECAST LOG: Found {len(user_data)} DB rows for user_id: {user_id} ---")
        if user_data:
            rows = []
            for r in user_data:
                rows.append(
                    {
                        "Date": r.Date,
                        "Temperature": r.Temperature,
                        "Fan": r.Fan,
                        "Fan_Units": r.Fan_Units,
                        "Refrigerator": r.Refrigerator,
                        "Fridge_Units": r.Fridge_Units,
                        "AirConditioner": r.AirConditioner,
                        "AC_Units": r.AC_Units,
                        "Bulb": r.Bulb,
                        "Bulb_Units": r.Bulb_Units,
                        "Television": r.Television,
                        "TV_Units": r.TV_Units,
                        "Monitor": r.Monitor,
                        "Monitor_Units": r.Monitor_Units,
                        "MotorPump": r.MotorPump,
                        "Motor_Units": r.Motor_Units,
                        "Month": r.Month,
                        "Units": r.Units,
                        "Extra": r.Extra,
                        "TariffRate": r.TariffRate,
                        "ElectricityBill": r.ElectricityBill,
                    }
                )
            df = pd.DataFrame(rows)
            df["Date"] = pd.to_datetime(df["Date"])
            df = df.set_index("Date").sort_index()
            return df, None
        return None, (jsonify({"error": "No data found. Please enter data manually."}), 404)
    except Exception as e:
        return None, (jsonify({"error": f"Error finding dataset: {str(e)}"}), 500)

def create_features(df):
    """
    Creates time series features from a dataframe.
    """
    df_new = df.copy()
    df_new['day_of_week'] = df_new.index.dayofweek
    df_new['month'] = df_new.index.month
    df_new['day_of_year'] = df_new.index.dayofyear
    df_new['lag_1'] = df_new['Units'].shift(1)
    df_new['lag_7'] = df_new['Units'].shift(7)
    df_new['rolling_mean_7'] = df_new['Units'].shift(1).rolling(window=7).mean()
    
    # Drop rows with NaN values created by shifts/rolling
    df_new = df_new.dropna() 
    return df_new

# -------------------- Routes (canonical) --------------------
@app.route("/")
def home():
    return "Energy Agent backend running"


# Upload CSV (canonical) - also attempts DB import when Authorization present
@app.route("/api/upload", methods=["POST", "OPTIONS"])
def api_upload():
    global global_df
    if request.method == "OPTIONS":
        return make_response("", 200)
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    try:
        stream = io.BytesIO(file.read())
        df = pd.read_csv(stream)
        df = normalize_columns(df)
        current_app.logger.info(f"Normalized columns: {df.columns.tolist()}")
        if "Date" in df.columns:
            # --- THIS IS THE NEW LOGIC (YOUR IDEA) ---
            # 1. Detect the format by scanning the whole column
            is_dayfirst = detect_dayfirst(df["Date"])
            
            # 2. Parse the entire column using the detected format
            df["Date"] = pd.to_datetime(df["Date"], dayfirst=is_dayfirst, errors="coerce")
            # --- END OF NEW LOGIC ---
            
            df = df.dropna(subset=["Date"])
            df = df.sort_values("Date")
        df.to_csv(LATEST_UPLOAD_PATH, index=False)
        global_df = df

        auth = request.headers.get("Authorization", None)
        added = 0
        skipped = 0
        updated = 0 # Track updates
        db_imported = False

        if auth and auth.startswith("Bearer "):
            try:
                # decode token identity using flask_jwt_extended helpers
                from flask_jwt_extended.utils import decode_token

                token = auth.split(" ", 1)[1]
                decoded = decode_token(token)
                sub = decoded.get("sub") or decoded.get("identity")
                user_id = int(sub) if sub is not None else None
            except Exception:
                user_id = None

            if user_id:
                db_imported = True
                for _, row in df.iterrows():
                    payload = {}
                    try:
                        payload["Date"] = pd.to_datetime(row.get("Date")).strftime("%Y-%m-%d")
                    except Exception:
                        payload["Date"] = str(row.get("Date"))
                    for c in [
                        "Temperature",
                        "Fan",
                        "Fan_Units",
                        "Refrigerator",
                        "Fridge_Units",
                        "AirConditioner",
                        "AC_Units",
                        "Bulb",
                        "Bulb_Units",
                        "Television",
                        "TV_Units",
                        "Monitor",
                        "Monitor_Units",
                        "MotorPump",
                        "Motor_Units",
                        "Month",
                        "Units",
                        "Extra",
                        "TariffRate",
                        "ElectricityBill",
                    ]:
                        if c in row.index:
                            payload[c] = row.get(c)
                    
                    # --- create_daily_entry_from_payload will now return the object ---
                    # --- We will check its 'updated' attribute (which we will add) ---
                    new_obj, err = create_daily_entry_from_payload(user_id, payload)
                    
                    if new_obj:
                        # Check if the object was updated or newly added
                        if getattr(new_obj, 'was_updated', False):
                            updated += 1
                        else:
                            added += 1
                    else:
                        skipped += 1

        resp = {"message": "Uploaded and saved", "rows": len(df), "db_imported": db_imported, "rows_added_to_db": added, "rows_updated_in_db": updated, "rows_skipped": skipped}
        return jsonify(resp), 201
    except Exception as e:
        current_app.logger.exception("api_upload failed")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


@app.route("/api/preview", methods=["GET", "OPTIONS"])
def api_preview():
    if request.method == "OPTIONS":
        return make_response("", 200)
    df = read_latest_uploaded_df()
    if df is None:
        return jsonify({"error": "No dataset loaded"}), 404
    return jsonify(df.head().to_dict(orient="records"))


# CSV-based forecast (canonical)
@app.route("/api/forecast", methods=["POST", "OPTIONS"])
def api_forecast():
    if request.method == "OPTIONS":
        return make_response("", 200)
    body = request.get_json(silent=True) or {}
    days = int(body.get("days", 7))
    df = read_latest_uploaded_df()
    if df is None or "Units" not in df.columns:
        return jsonify({"error": "No 'Units' column found in uploaded dataset — ensure column named 'Units' or 'units'."}), 400
    try:
        series = df[["Date", "Units"]].copy()
        series = series.set_index("Date").resample("D").sum().ffill().bfill()
        from statsmodels.tsa.statespace.sarimax import SARIMAX

        if len(series) < 10:
            return jsonify({"error": "Not enough data for forecasting (need ~>10 days)"}), 400

        model = SARIMAX(series["Units"], order=(1, 1, 1), seasonal_order=(1, 1, 1, 7))
        mfit = model.fit(disp=False)
        forecast_values = mfit.forecast(steps=days)
        forecast_dict = {str(k.date()): float(v) for k, v in forecast_values.items()}
        history = series["Units"].tail(14).to_dict()
        return jsonify({"forecast": forecast_dict, "history": {str(d.date()): float(v) for d, v in history.items()}})
    except Exception as e:
        current_app.logger.exception("api_forecast error")
        return jsonify({"error": f"Forecast failed: {str(e)}"}), 500


# DB-backed forecast for authenticated users (V11 - Corrected Resampling)
# DB-backed forecast for authenticated users (V13 - Transfer Learning)
@app.route("/api/forecast_user", methods=["POST", "OPTIONS"])
@jwt_required()
def api_forecast_user():
    if request.method == "OPTIONS":
        return make_response("", 200)

    body = request.get_json(silent=True) or {}
    forecast_steps = int(body.get("days", 30))
    city_name = body.get("city", "Bangalore") 
    
    if not city_name:
        return jsonify({'error': 'City name is required for weather forecast.'}), 400

    # 1. Get user's personal data
    df, error = get_user_data_as_dataframe()
    if error:
        return error
    try:
        if "Units" not in df.columns or df["Units"].isnull().all():
            return jsonify({'error': 'No "Units" data available for forecasting.'}), 400
        
        df_base = df[["Units", "Temperature"]].resample("D").asfreq().ffill().bfill()
        
        if len(df_base) < 30:
            return jsonify({'error': 'Not enough data for fine-tuning (need at least 30 days).'}), 400

        # 2. Create features for user's personal data
        df_ml = create_features_with_weather(df_base)
        
        FEATURES = ['day_of_week', 'month', 'day_of_year', 'lag_1', 'lag_7', 'rolling_mean_7', 'Temperature']
        TARGET = 'Units'
        
        X_user = df_ml[FEATURES]
        y_user = df_ml[TARGET]

        # 3. --- FINE-TUNING WORKFLOW ---
        current_app.logger.info("Loading pre-trained base_model.pkl...")
        
        # Load the "master chef" model
        with open('base_model.pkl', 'rb') as f:
            model = pickle.load(f)
        
        # Fine-tune the model by training it *more* on the user's personal data
        current_app.logger.info("Fine-tuning model on user data...")
        model.fit(X_user, y_user)
        # --- END OF WORKFLOW ---
        
        # 4. Get Historical Predictions
        historical_forecast = model.predict(X_user)

        # 5. Get Future Weather
        current_app.logger.info(f"Fetching weather for city: {city_name}")
        api_days = min(int(forecast_steps), 14) 
        future_temps = get_future_weather(city=city_name, days=api_days)
        current_app.logger.info(f"Weather data received: {future_temps}")
        
        if len(future_temps) < forecast_steps:
            last_temp = future_temps[-1] if future_temps else 25.0
            future_temps.extend([last_temp] * (forecast_steps - len(future_temps)))
        
        # 6. Generate Future Predictions (Recursively)
        future_forecast = []
        last_row = df_ml.iloc[-1]
        current_features = last_row[FEATURES].to_dict()
        current_date = df_ml.index[-1]

        for i in range(forecast_steps):
            current_features['Temperature'] = future_temps[i]
            features_df = pd.DataFrame([current_features])
            features_df = features_df[FEATURES] 
            
            next_pred = model.predict(features_df)[0]
            future_forecast.append(float(next_pred))
            
            # Update features for the *next* loop
            current_date += pd.Timedelta(days=1)
            # ... (rest of the recursive update logic is the same) ...
            current_features['day_of_week'] = current_date.dayofweek
            current_features['month'] = current_date.month
            current_features['day_of_year'] = current_date.dayofyear
            current_features['lag_1'] = next_pred
            
            lag_7_date = current_date - pd.Timedelta(days=7)
            if lag_7_date in df_ml.index:
                current_features['lag_7'] = df_ml.loc[lag_7_date][TARGET]
            else:
                if lag_7_date >= (df_ml.index[-1] + pd.Timedelta(days=1)):
                    if (i-7) >= 0:
                        current_features['lag_7'] = future_forecast[i-7]
                    else:
                        current_features['lag_7'] = last_row['lag_7']
                else:
                    current_features['lag_7'] = last_row['lag_7']
            current_features['rolling_mean_7'] = (current_features['rolling_mean_7'] * 6 + next_pred) / 7

        # 7. Calculate Metrics
        # ... (Metrics calculation is the same) ...
        metrics = None
        try:
            actuals = y_user
            preds = historical_forecast
            mae = mean_absolute_error(actuals, preds)
            rmse = np.sqrt(mean_squared_error(actuals, preds))
            mape_series = np.abs((actuals - preds) / actuals)
            mape = np.mean(mape_series[np.isfinite(mape_series)]) * 100
            metrics = {
                "MAE": round(mae, 3),
                "RMSE": round(rmse, 3),
                "MAPE (%)": round(mape, 3)
            }
        except Exception as e:
            current_app.logger.error(f"ML metrics calculation failed: {e}")
            metrics = None
        
        # 8. Format data for the frontend
        # ... (Data formatting is the same) ...
        raw_units_reindexed = df[TARGET].reindex(df_ml.index)
        history_dict = {str(d.date()): (float(v) if pd.notna(v) else None) 
                        for d, v in raw_units_reindexed.items()}
        historical_preds_dict = {str(d.date()): float(v) 
                                 for d, v in zip(X_user.index, historical_forecast)}
        future_dates = pd.date_range(start=df_ml.index[-1] + pd.Timedelta(days=1), periods=forecast_steps)
        future_preds_dict = {str(d.date()): float(v) 
                             for d, v in zip(future_dates, future_forecast)}
        
        return jsonify({
            "message": f"Fine-tuned XGBoost + Weather forecast for {forecast_steps} days generated for {city_name}.",
            "history": history_dict,
            "forecast": future_preds_dict,
            "historical_forecast": historical_preds_dict,
            "metrics": metrics
        })

    except Exception as e:
        current_app.logger.exception("api_forecast_user (XGBoost+Weather) error")
        if "400 Client Error: Bad Request" in str(e) or "No matching location found" in str(e):
             return jsonify({'error': f'Weather API error: No matching location found for city "{city_name}".'}), 400
        return jsonify({'error': f'Error during ML forecasting: {str(e)}'}), 500

# CSV-based recommendations (canonical)
@app.route("/api/recommendations", methods=["GET", "OPTIONS"])
def api_recommendations():
    if request.method == "OPTIONS":
        return make_response("", 200)
    df = read_latest_uploaded_df()
    if df is None:
        return jsonify({"error": "No dataset loaded"}), 400
    df_cols = df.columns.tolist()
    appliance_cols = [c for c in df_cols if c not in ["Date", "Temperature", "Units", "Month", "Extra", "TariffRate", "ElectricityBill"]]
    recommendations = []
    for appliance in appliance_cols:
        if appliance in ("Units", "Date"):
            continue
        avg_usage = round(df[appliance].mean(), 2) if appliance in df.columns else None
        unit_col = f"{appliance}_Units" if f"{appliance}_Units" in df.columns else None
        avg_units = round(df[unit_col].mean(), 2) if unit_col else None
        if avg_usage and avg_usage > 8:
            msg = f"High usage of {appliance} (~{avg_usage} hrs/day). Consider reducing runtime."
        elif avg_usage and avg_usage < 2:
            msg = f"Low usage of {appliance} (~{avg_usage} hrs/day). Good efficiency."
        else:
            msg = f"Moderate usage of {appliance} (~{avg_usage} hrs/day)."
        if avg_units and avg_units > 5:
            msg += f" Consumes about {avg_units} kWh/day — consider off-peak usage."
        recommendations.append({"appliance": appliance, "avg_usage": avg_usage, "avg_units": avg_units, "recommendation": msg})
    return jsonify({"recommendations": recommendations})


# DB-backed recommendations
@app.route("/api/recommendations_user", methods=["GET", "OPTIONS"])
@jwt_required()
def api_recommendations_user():
    if request.method == "OPTIONS":
        return make_response("", 200)
    df, error = get_user_data_as_dataframe()
    if error:
        return error
    return api_recommendations()


@app.route("/api/health", methods=["GET", "OPTIONS"])
def api_health():
    if request.method == "OPTIONS":
        return make_response("", 200)
    return jsonify({"status": "ok"})


# -------------------- Auth: register & login --------------------
@app.route("/api/register", methods=["POST", "OPTIONS"])
def api_register():
    if request.method == "OPTIONS":
        return make_response("", 200)
    try:
        data = request.get_json(force=True)
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        if not username or not email or not password:
            return jsonify({"message": "username, email and password are required"}), 400
        if User.query.filter((User.email == email) | (User.username == username)).first():
            return jsonify({"message": "User with this email or username already exists"}), 409
        pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        user = User(username=username, email=email, password_hash=pw_hash, role="user")
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "User created successfully", "user_id": user.user_id}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Register failed")
        return jsonify({"message": f"Registration error: {str(e)}"}), 500


@app.route("/api/login", methods=["POST", "OPTIONS"])
def api_login():
    if request.method == "OPTIONS":
        return make_response("", 200)
    try:
        data = request.get_json(force=True)
        email = data.get("email")
        password = data.get("password")
        if not email or not password:
            return jsonify({"message": "email and password are required"}), 400
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"message": "User not found"}), 404
        if not bcrypt.check_password_hash(user.password_hash, password):
            return jsonify({"message": "Invalid credentials"}), 401
        identity = str(user.user_id)
        additional_claims = {"email": user.email, "role": user.role, "username": user.username}
        access_token = create_access_token(identity=identity, additional_claims=additional_claims)
        return jsonify({"message": "Login successful", "access_token": access_token, "user": additional_claims}), 200
    except Exception as e:
        current_app.logger.exception("Login failed")
        return jsonify({"message": f"Login error: {str(e)}"}), 500


# -------------------- DB-backed data endpoints (RENAMED) --------------------
@app.route("/api/data_db", methods=["GET", "OPTIONS"])
@jwt_required()
def get_data_db():
    if request.method == "OPTIONS":
        return make_response("", 200)
    try:
        user_id = int(get_jwt_identity())
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        query = DailyData.query.filter_by(user_id=user_id)
        if start_date:
            start_date_obj = datetime.datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(DailyData.Date >= start_date_obj)
        if end_date:
            end_date_obj = datetime.datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(DailyData.Date <= end_date_obj)
        user_data = query.order_by(DailyData.Date.asc()).all()
        if not user_data:
            return jsonify({"message": "No data found for this user. Please add data manually or upload a dataset."}), 404
        results = []
        for r in user_data:
            results.append(
                {
                    "data_id": r.data_id,
                    "Date": r.Date.strftime("%Y-%m-%d"),
                    "Temperature": r.Temperature,
                    "Fan": r.Fan,
                    "Fan_Units": r.Fan_Units,
                    "Refrigerator": r.Refrigerator,
                    "Fridge_Units": r.Fridge_Units,
                    "AirConditioner": r.AirConditioner,
                    "AC_Units": r.AC_Units,
                    "Bulb": r.Bulb,
                    "Bulb_Units": r.Bulb_Units,
                    "Television": r.Television,
                    "TV_Units": r.TV_Units,
                    "Monitor": r.Monitor,
                    "Monitor_Units": r.Monitor_Units,
                    "MotorPump": r.MotorPump,
                    "Motor_Units": r.Motor_Units,
                    "Month": r.Month,
                    "Units": r.Units,
                    "Extra": r.Extra,
                    "TariffRate": r.TariffRate,
                    "ElectricityBill": r.ElectricityBill,
                }
            )
        return jsonify(results)
    except Exception as e:
        current_app.logger.exception("get_data_db error")
        return jsonify({"error": f"Error processing data: {str(e)}"}), 500


def create_daily_entry_from_payload(user_id: int, payload: dict):
    if not payload.get("Date") or payload.get("Units") is None:
        return None, (jsonify({"error": "Date and Units are required"}), 400)
    
    try:
        # This will now correctly handle the datetime objects
        # passed from the fixed api_upload function
        date_obj = pd.to_datetime(payload.get("Date"), errors="coerce")
        
        # If it failed (e.g., manual entry), try to parse it
        if pd.isna(date_obj):
            try:
                # Try parsing as YYYY-MM-DD
                date_obj = datetime.datetime.strptime(payload.get("Date"), "%Y-%m-%d").date()
            except Exception:
                # Try parsing as dayfirst=True
                date_obj = pd.to_datetime(payload.get("Date"), dayfirst=True, errors="coerce")
        
        if pd.isna(date_obj):
             return None, (jsonify({"error": "Invalid Date format"}), 400)
             
        date_obj = date_obj.date()

    except Exception as e:
        current_app.logger.error(f"Date parsing error: {e}")
        return None, (jsonify({"error": f"Invalid Date format: {payload.get('Date')}"}), 400)


    def _f(k): return get_float_or_none(payload.get(k))
    def _i(k): return get_int_or_none(payload.get(k))

    try:
        # Check if an entry for this user and date already exists
        existing = DailyData.query.filter_by(user_id=user_id, Date=date_obj).first()
        
        if existing:
            # --- THIS IS THE FIX ---
            # If it exists, UPDATE its values from the new file
            current_app.logger.info(f"Updating data for date: {date_obj}")
            existing.Temperature = _f("Temperature")
            existing.Fan = _f("Fan")
            existing.Fan_Units = _f("Fan_Units")
            existing.Refrigerator = _f("Refrigerator")
            existing.Fridge_Units = _f("Fridge_Units")
            existing.AirConditioner = _f("AirConditioner")
            existing.AC_Units = _f("AC_Units")
            existing.Bulb = _f("Bulb")
            existing.Bulb_Units = _f("Bulb_Units")
            existing.Television = _f("Television")
            existing.TV_Units = _f("TV_Units")
            existing.Monitor = _f("Monitor")
            existing.Monitor_Units = _f("Monitor_Units")
            existing.MotorPump = _f("MotorPump")
            existing.Motor_Units = _f("Motor_Units")
            existing.Month = _i("Month")
            existing.Units = _f("Units")
            existing.Extra = _f("Extra")
            existing.TariffRate = _f("TariffRate")
            existing.ElectricityBill = _f("ElectricityBill")
            
            db.session.commit()
            existing.was_updated = True # Set a flag for the log
            return existing, None
            # --- END OF FIX ---
        else:
            # If it doesn't exist, create a new one
            new = DailyData(
                user_id=user_id,
                Date=date_obj,
                Temperature=_f("Temperature"),
                Fan=_f("Fan"),
                Fan_Units=_f("Fan_Units"),
                Refrigerator=_f("Refrigerator"),
                Fridge_Units=_f("Fridge_Units"),
                AirConditioner=_f("AirConditioner"),
                AC_Units=_f("AC_Units"),
                Bulb=_f("Bulb"),
                Bulb_Units=_f("Bulb_Units"),
                Television=_f("Television"),
                TV_Units=_f("TV_Units"),
                Monitor=_f("Monitor"),
                Monitor_Units=_f("Monitor_Units"),
                MotorPump=_f("MotorPump"),
                Motor_Units=_f("Motor_Units"),
                Month=_i("Month"),
                Units=_f("Units"),
                Extra=_f("Extra"),
                TariffRate=_f("TariffRate"),
                ElectricityBill=_f("ElectricityBill"),
            )
            db.session.add(new)
            db.session.commit()
            new.was_updated = False
            return new, None
            
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("create_daily_entry failed")
        return None, (jsonify({"error": f"An error occurred: {str(e)}"}), 500)


@app.route("/api/add_daily_data", methods=["POST", "OPTIONS"])
@jwt_required()
def add_daily_data():
    if request.method == "OPTIONS":
        return make_response("", 200)
    try:
        user_id = int(get_jwt_identity())
        payload = request.get_json(force=True)
        new, err = create_daily_entry_from_payload(user_id, payload)
        if err:
            return err
        return jsonify({"message": "Data entry saved successfully", "data_id": new.data_id}), 201
    except Exception as e:
        current_app.logger.exception("add_daily_data error")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


# -------------------- Compatibility shims (explicit OPTIONS handling) --------------------
@app.route("/api/upload_dataset", methods=["POST", "OPTIONS"])
def shim_upload_dataset():
    if request.method == "OPTIONS":
        return make_response("", 200)
    try:
        return api_upload()
    except NameError:
        current_app.logger.warning("api_upload not found")
        return jsonify({"error": "Upload handler not found"}), 500


@app.route("/api/data", methods=["GET", "OPTIONS"])
def shim_get_data():
    if request.method == "OPTIONS":
        return make_response("", 200)
    try:
        auth = request.headers.get("Authorization", None)
        if auth and auth.startswith("Bearer "):
            try:
                # call DB-backed handler but if it raises token errors or returns non-2xx, fall back to CSV
                try:
                    result = get_data_db()
                except ExpiredSignatureError:
                    current_app.logger.debug("Token expired — shim falling back to CSV preview")
                    result = None
                except InvalidTokenError:
                    current_app.logger.debug("Invalid token — shim falling back to CSV preview")
                    result = None
                except Exception:
                    # other exceptions from get_data_db (e.g., no token present for decorator)
                    current_app.logger.debug("get_data_db() call in shim failed — falling back to CSV preview", exc_info=True)
                    result = None

                if result:
                    status_code = getattr(result, "status_code", None)
                    # treat any non-2xx as fallback
                    if status_code is None or (200 <= status_code < 300):
                        return result
                    else:
                        current_app.logger.debug(f"get_data_db returned status {status_code}; falling back to CSV preview")
            except Exception:
                current_app.logger.debug("get_data_db() wrapper failed — falling back to CSV preview", exc_info=True)

        # CSV fallback
        df = read_latest_uploaded_df()
        if df is None:
            return jsonify({"error": "No dataset loaded"}), 404
        if hasattr(df.index, "strftime"):
            df = df.reset_index()
        return jsonify(df.to_dict(orient="records"))
    except Exception as e:
        current_app.logger.exception("shim_get_data error")
        return jsonify({"error": str(e)}), 500


@app.route("/api/add_daily_data_shim", methods=["POST", "OPTIONS"])
def shim_add_daily_data_endpoint():
    if request.method == "OPTIONS":
        return make_response("", 200)
    auth = request.headers.get("Authorization", None)
    if not auth or not auth.startswith("Bearer "):
        return jsonify({"error": "Authorization header with Bearer token required"}), 401
    try:
        return add_daily_data()
    except Exception as e:
        current_app.logger.exception("shim_add_daily_data error")
        return jsonify({"error": str(e)}), 500


@app.route("/api/upload_dataset_legacy", methods=["POST", "OPTIONS"])
def shim_upload_legacy():
    if request.method == "OPTIONS":
        return make_response("", 200)
    return shim_upload_dataset()


# -------------------- Alias routes (non-API paths older frontends may call) --------------------
@app.route("/forecast", methods=["POST", "OPTIONS"])
def alias_forecast():
    if request.method == "OPTIONS":
        return make_response("", 200)
    return api_forecast()


@app.route("/recommendations", methods=["GET", "OPTIONS"])
def alias_recommendations():
    if request.method == "OPTIONS":
        return make_response("", 200)
    return api_recommendations()


# -------------------- DELETE route for selected ids (protected) --------------------
@app.route("/api/delete_data", methods=["DELETE", "OPTIONS"])
@jwt_required()
def delete_data():
    if request.method == "OPTIONS":
        return make_response("", 200)
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json(force=True)
        ids_to_delete = data.get("ids") if isinstance(data, dict) else None
        if not ids_to_delete:
            return jsonify({"error": "No IDs provided"}), 400
        num_deleted = db.session.query(DailyData).filter(DailyData.user_id == user_id, DailyData.data_id.in_(ids_to_delete)).delete(synchronize_session=False)
        db.session.commit()
        return jsonify({"message": f"Successfully deleted {num_deleted} entries."}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("delete_data error")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


# -------------------- Run --------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)