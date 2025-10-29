from flask import Flask, request, jsonify
import os
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX
import warnings
from flask_cors import CORS

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:3001"]}})

UPLOAD_FOLDER = 'data'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ✅ Global dataframe (shared between upload and forecast)
df = None


@app.route('/')
def home():
    return "✅ Energy Forecasting Backend Running!"


# ✅ Upload dataset
@app.route('/upload', methods=['POST'])
def upload_file():
    global df
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        df = pd.read_csv(file_path)
        df['Date'] = pd.to_datetime(df['Date'], format="mixed", dayfirst=True)
        df = df.sort_values('Date')
        return jsonify({"message": "✅ Dataset uploaded successfully", "rows": len(df)})
    except Exception as e:
        return jsonify({"error": f"Error reading dataset: {str(e)}"}), 500


# ✅ Preview first few rows
@app.route('/preview', methods=['GET'])
def preview():
    global df
    if df is None:
        return jsonify({"error": "No dataset loaded"}), 400
    return jsonify(df.head().to_dict(orient="records"))


# ✅ Forecast using last uploaded dataset
# ✅ Forecast for user-selected period
# ✅ Forecast for user-selected period
@app.route('/forecast', methods=['POST'])
def forecast():
    global df

    if df is None:
        data_files = os.listdir(UPLOAD_FOLDER)
        if data_files:
            latest_file = os.path.join(UPLOAD_FOLDER, data_files[-1])
            df = pd.read_csv(latest_file)
            df['Date'] = pd.to_datetime(df['Date'], format="mixed", dayfirst=True)
            df = df.sort_values('Date')
        else:
            return jsonify({"error": "No dataset loaded"}), 400

    try:
        # 🕒 Get forecast period from frontend
        data = request.get_json()
        steps = int(data.get("days", 7))  # default 7 days

        df_copy = df[['Date', 'Units']].copy()
        df_copy = df_copy.set_index('Date')
        df_copy = df_copy.asfreq('D')
        df_copy['Units'] = df_copy['Units'].fillna(method='ffill')

        # 🧠 Split data for evaluation
        if len(df_copy) > steps:
            train = df_copy.iloc[:-steps]
            test = df_copy.iloc[-steps:]
        else:
            train = df_copy
            test = pd.DataFrame()

        # 🔮 Train model
        model = SARIMAX(train['Units'], order=(1, 1, 1), seasonal_order=(1, 1, 1, 7))
        model_fit = model.fit(disp=False)

        # 🧾 Forecast future values
        forecast_values = model_fit.forecast(steps=steps)
        forecast_dict = {str(k.date()): v for k, v in forecast_values.items()}
        history_dict = {str(k.date()): v for k, v in df_copy['Units'].tail(10).items()}

        # 📏 Compute metrics only if test data available
        metrics = {}
        if not test.empty:
            test_forecast = forecast_values[:len(test)]
            mae = abs(test_forecast - test['Units']).mean()
            rmse = ((test_forecast - test['Units']) ** 2).mean() ** 0.5
            mape = (abs(test_forecast - test['Units']) / test['Units']).mean() * 100
            metrics = {
                "MAE": round(mae, 3),
                "RMSE": round(rmse, 3),
                "MAPE (%)": round(mape, 2),
            }

        result = {
            "history": history_dict,
            "forecast": forecast_dict,
            "metrics": metrics,
            "message": f"✅ Forecast generated for next {steps} days.",
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Energy Usage Recommendations
@app.route('/recommendations', methods=['GET'])
def recommendations():
    global df
    if df is None:
        return jsonify({"error": "No dataset loaded"}), 400

    try:
        df_cols = df.columns.tolist()
        print(f"✅ Dataset columns: {df_cols}")

        # Identify appliances (excluding non-relevant columns)
        appliance_cols = [c for c in df_cols if "(" not in c and c not in ["Date", "Temperature", "Units", "Month", "Extra", "TariffRate", "ElectricityBill"]]
        print(f"🔍 Appliance columns detected: {appliance_cols}")

        recommendations = []

        for appliance in appliance_cols:
            # Find the matching “(Units)” column if present
            unit_col = None
            for c in df_cols:
                if appliance.lower() in c.lower() and "(units)" in c.lower():
                    unit_col = c
                    break

            # Compute average usage (hours/day)
            avg_usage = round(df[appliance].mean(), 2) if appliance in df else None

            # Compute average units (kWh/day)
            avg_units = round(df[unit_col].mean(), 2) if unit_col and unit_col in df else None

            # Recommendation logic
            if avg_usage and avg_usage > 8:
                msg = f"High usage of {appliance} (~{avg_usage} hrs/day). Consider reducing runtime or using energy-saving mode."
            elif avg_usage and avg_usage < 2:
                msg = f"Low usage of {appliance} (~{avg_usage} hrs/day). Great energy efficiency!"
            else:
                msg = f"Moderate usage of {appliance} (~{avg_usage} hrs/day). Maintain this level for optimal energy consumption."

            # Add an energy-specific suggestion
            if avg_units and avg_units > 5:
                msg += f" Consumes about {avg_units} kWh/day — try operating during off-peak hours."

            recommendations.append({
                "appliance": appliance,
                "avg_usage": avg_usage,
                "avg_units": avg_units,
                "recommendation": msg
            })

        print(f"✅ Generated recommendations: {recommendations[:3]} ...")  # Print first few only
        return jsonify({"recommendations": recommendations})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
