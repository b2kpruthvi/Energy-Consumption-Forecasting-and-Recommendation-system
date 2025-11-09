from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import datetime
import numpy as np
import statsmodels.api as sm
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, JWTManager
from sqlalchemy import func
import io # <-- NEW: Need this for reading file stream

app = Flask(__name__)
# Allow all origins for simplicity during development
CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- DATABASE CONFIGURATION ---
DB_USER = 'postgres'
DB_PASS = 'hemanth%402004'  # Your PostgreSQL password
DB_HOST = 'localhost'
DB_PORT = '5432'
DB_NAME = 'energy_db'

app.config['SQLALCHEMY_DATABASE_URI'] = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-super-secret-random-string'  # Change this to a real secret key
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# --- DATABASE MODELS ---
# (Models are unchanged from your last version)
class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(10), nullable=False, default='user')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    daily_data = db.relationship('DailyData', backref='owner', lazy=True)

class DailyData(db.Model):
    __tablename__ = 'daily_data'
    data_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
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
    
    # --- NEW: Add a unique constraint ---
    # This prevents a user from having two entries for the same date
    __table_args__ = (db.UniqueConstraint('user_id', 'Date', name='_user_date_uc'),)


# --- HELPER FUNCTIONS ---
# (Unchanged)
def get_float_or_none(value):
    if value is None or value == '': return None
    try: return float(value)
    except (ValueError, TypeError): return None

def get_int_or_none(value):
    if value is None or value == '': return None
    try: return int(value)
    except (ValueError, TypeError): return None

def get_user_data_as_dataframe():
    try:
        user_id = int(get_jwt_identity())
        user_data = DailyData.query.filter_by(user_id=user_id).all()
        if user_data:
            df = pd.DataFrame([vars(r) for r in user_data]) # Simpler conversion
            df['Date'] = pd.to_datetime(df['Date'])
            df = df.set_index('Date').sort_index()
            df = df.drop(columns=['_sa_instance_state', 'data_id', 'user_id']) # Clean helper columns
            return df, None
        return None, (jsonify({'error': 'No data found. Please enter data manually.'}), 404)
    except Exception as e:
        return None, (jsonify({'error': f'Error finding dataset: {str(e)}'}), 500)


# --- AUTHENTICATION ROUTES ---
# (Unchanged)
@app.route('/api/register', methods=['POST'])
def register():
    # ... (same as your code)
    data = request.get_json()
    user_by_email = User.query.filter_by(email=data['email']).first()
    user_by_username = User.query.filter_by(username=data['username']).first()
    
    if user_by_email:
        return jsonify({"message": "Email already registered"}), 409
    if user_by_username:
        return jsonify({"message": "Username already taken"}), 409
        
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(
        username=data['username'], 
        email=data['email'], 
        password_hash=hashed_password, 
        role='user'
    )
    db.session.add(new_user) 
    db.session.commit()
    return jsonify({"message": "User created successfully"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    # ... (same as your code)
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    if bcrypt.check_password_hash(user.password_hash, password):
        identity = str(user.user_id) 
        additional_claims = {'email': user.email, 'role': user.role, 'username': user.username}
        access_token = create_access_token(identity=identity, additional_claims=additional_claims)
        return jsonify({
            "message": "Login successful", 
            "access_token": access_token,
            "user": additional_claims
        }), 200
    else:
        return jsonify({"message": "Invalid email or password"}), 401

# --- DATA ENTRY ROUTES ---

@app.route('/api/add_daily_data', methods=['POST'])
@jwt_required()
def add_daily_data():
    # (Logic is unchanged, but I simplified the model call)
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()

        if not data.get('Date'):
            return jsonify({'error': 'Date is required.'}), 400
        if data.get('Units') is None:
            return jsonify({'error': 'Units is required.'}), 400
            
        date_obj = datetime.datetime.strptime(data.get('Date'), '%Y-%m-%d').date()
        
        existing_entry = DailyData.query.filter_by(user_id=user_id, Date=date_obj).first()
        if existing_entry:
            return jsonify({'error': f'Data for date {data.get("Date")} already exists.'}), 409

        new_data_entry = DailyData(
            user_id=user_id,
            Date=date_obj,
            Temperature=get_float_or_none(data.get('Temperature')),
            Fan=get_float_or_none(data.get('Fan')),
            Fan_Units=get_float_or_none(data.get('Fan_Units')),
            Refrigerator=get_float_or_none(data.get('Refrigerator')),
            Fridge_Units=get_float_or_none(data.get('Fridge_Units')),
            AirConditioner=get_float_or_none(data.get('AirConditioner')),
            AC_Units=get_float_or_none(data.get('AC_Units')),
            Bulb=get_float_or_none(data.get('Bulb')),
            Bulb_Units=get_float_or_none(data.get('Bulb_Units')),
            Television=get_float_or_none(data.get('Television')),
            TV_Units=get_float_or_none(data.get('TV_Units')),
            Monitor=get_float_or_none(data.get('Monitor')),
            Monitor_Units=get_float_or_none(data.get('Monitor_Units')),
            MotorPump=get_float_or_none(data.get('MotorPump')),
            Motor_Units=get_float_or_none(data.get('Motor_Units')),
            Month=get_int_or_none(data.get('Month')),
            Units=get_float_or_none(data.get('Units')),
            Extra=get_float_or_none(data.get('Extra')),
            TariffRate=get_float_or_none(data.get('TariffRate')),
            ElectricityBill=get_float_or_none(data.get('ElectricityBill'))
        )
        db.session.add(new_data_entry)
        db.session.commit()
        return jsonify({'message': 'Data entry saved successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500


# --- NEW: FILE UPLOAD ROUTE ---
@app.route('/api/upload_dataset', methods=['POST'])
@jwt_required()
def upload_dataset():
    user_id = int(get_jwt_identity())
    
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        try:
            # Read file into a pandas DataFrame
            # Use io.BytesIO to read the file stream directly
            stream = io.BytesIO(file.read())
            if file.filename.endswith('.csv'):
                df = pd.read_csv(stream)
            elif file.filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(stream)
            else:
                return jsonify({"error": "Invalid file type. Please upload a CSV or Excel file."}), 400

            # Normalize column names to match the database model
            # (e.g., "Fan (Units)" -> "Fan_Units")
            df.columns = df.columns.str.replace(r' \((.*?)\)', '_', regex=True).str.replace(' ', '_')

            entries_added = 0
            entries_skipped = 0
            
            # Iterate over DataFrame rows and add to database
            for _, row in df.iterrows():
                date_obj = pd.to_datetime(row['Date']).date()
                
                # Check if data for this date already exists
                existing_entry = DailyData.query.filter_by(user_id=user_id, Date=date_obj).first()
                if existing_entry:
                    entries_skipped += 1
                    continue

                # Create new DailyData object using helpers
                new_entry = DailyData(
                    user_id=user_id,
                    Date=date_obj,
                    Temperature=get_float_or_none(row.get('Temperature')),
                    Fan=get_float_or_none(row.get('Fan')),
                    Fan_Units=get_float_or_none(row.get('Fan_Units')),
                    Refrigerator=get_float_or_none(row.get('Refrigerator')),
                    Fridge_Units=get_float_or_none(row.get('Fridge_Units')),
                    AirConditioner=get_float_or_none(row.get('AirConditioner')),
                    AC_Units=get_float_or_none(row.get('AC_Units')),
                    Bulb=get_float_or_none(row.get('Bulb')),
                    Bulb_Units=get_float_or_none(row.get('Bulb_Units')),
                    Television=get_float_or_none(row.get('Television')),
                    TV_Units=get_float_or_none(row.get('TV_Units')),
                    Monitor=get_float_or_none(row.get('Monitor')),
                    Monitor_Units=get_float_or_none(row.get('Monitor_Units')),
                    MotorPump=get_float_or_none(row.get('MotorPump')),
                    Motor_Units=get_float_or_none(row.get('Motor_Units')),
                    Month=get_int_or_none(row.get('Month')),
                    Units=get_float_or_none(row.get('Units')),
                    Extra=get_float_or_none(row.get('Extra')),
                    TariffRate=get_float_or_none(row.get('TariffRate')),
                    ElectricityBill=get_float_or_none(row.get('ElectricityBill'))
                )
                db.session.add(new_entry)
                entries_added += 1

            db.session.commit()
            return jsonify({
                "message": f"File processed successfully. Added {entries_added} new entries. Skipped {entries_skipped} duplicate entries."
            }), 201

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Error processing file: {str(e)}"}), 500

# --- MODIFIED: DATA/FORECAST ROUTES ---

@app.route('/api/data', methods=['GET'])
@jwt_required()
def get_data():
    """
    Fetches user's data.
    - If no data, returns 404.
    - If start_date/end_date params are given, filters by date.
    - Otherwise, returns all data.
    """
    try:
        user_id = int(get_jwt_identity())
        
        # Get date range from query parameters if they exist
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # Start building the query
        query = DailyData.query.filter_by(user_id=user_id)

        # Apply date filters if provided
        if start_date:
            start_date_obj = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(DailyData.Date >= start_date_obj)
        
        if end_date:
            end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(DailyData.Date <= end_date_obj)

        # Order by date and execute query
        user_data = query.order_by(DailyData.Date.asc()).all()

        # --- Handle No Data Response ---
        if not user_data:
            return jsonify({
                "message": "No data found for this user. Please add data manually or upload a dataset."
            }), 404

        # Convert data to a list of dictionaries for JSON
        results = []
        for r in user_data:
            results.append({
                'data_id': r.data_id,
                'Date': r.Date.strftime('%Y-%m-%d'),
                'Temperature': r.Temperature,
                'Fan': r.Fan, 'Fan_Units': r.Fan_Units,
                'Refrigerator': r.Refrigerator, 'Fridge_Units': r.Fridge_Units,
                'AirConditioner': r.AirConditioner, 'AC_Units': r.AC_Units,
                'Bulb': r.Bulb, 'Bulb_Units': r.Bulb_Units,
                'Television': r.Television, 'TV_Units': r.TV_Units,
                'Monitor': r.Monitor, 'Monitor_Units': r.Monitor_Units,
                'MotorPump': r.MotorPump, 'Motor_Units': r.Motor_Units,
                'Month': r.Month,
                'Units': r.Units,
                'Extra': r.Extra,
                'TariffRate': r.TariffRate,
                'ElectricityBill': r.ElectricityBill
            })
            
        return jsonify(results)

    except Exception as e:
        return jsonify({'error': f'Error processing data: {str(e)}'}), 500


@app.route('/api/forecast', methods=['GET'])
@jwt_required() 
def get_forecast():
    # (This route is unchanged, it correctly uses the helper function)
    df, error = get_user_data_as_dataframe()
    if error:
        return error
    try:
        if 'Units' not in df.columns or df['Units'].isnull().all():
             return jsonify({'error': 'No "Units" data available for forecasting.'}), 400
        series = df['Units'].ffill().bfill() 
        series_daily = series.resample('D').sum().ffill().bfill()
        if len(series_daily) < 14: 
            return jsonify({'error': 'Not enough data (need at least 14 days).'}), 400

        model = sm.tsa.SARIMAX(series_daily,
                                order=(1, 1, 1), 
                                seasonal_order=(1, 1, 1, 7),
                                enforce_stationarity=False,
                                enforce_invertibility=False)
        model_fit = model.fit(disp=False) 
        forecast_steps = 30 
        forecast_result = model_fit.get_forecast(steps=forecast_steps)
        forecast = forecast_result.predicted_mean 
        future_dates = pd.date_range(start=series_daily.index[-1], periods=forecast_steps + 1, freq='D')[1:]
        
        forecast_data = {
            'historical_dates': series_daily.index.strftime('%Y-%m-%d').tolist(),
            'historical_values': series_daily.tolist(),
            'forecast_dates': future_dates.strftime('%Y-%m-%d').tolist(),
            'forecast_values': forecast.tolist()
        }
        return jsonify(forecast_data)
    except Exception as e:
        return jsonify({'error': f'Error during forecasting: {str(e)}'}), 500

@app.route('/api/recommendations', methods=['GET'])
@jwt_required()
def get_recommendations():
    # (This route is unchanged, it correctly uses the helper function)
    df, error = get_user_data_as_dataframe()
    if error:
        return error
    try:
        appliance_cols = [
            'Fan', 'Refrigerator', 'AirConditioner', 'Bulb', 'Television', 
            'Monitor', 'MotorPump'
        ]
        recommendations = []
        for appliance in appliance_cols:
            if appliance not in df.columns: continue
            unit_col = f"{appliance}_Units"
            avg_usage = round(df[appliance].mean(), 2)
            avg_units = None
            if unit_col in df.columns:
                avg_units = round(df[unit_col].mean(), 2)
            msg = ""
            if avg_usage and avg_usage > 8:
                msg = f"High usage of {appliance} (~{avg_usage} hrs/day). Consider reducing runtime."
            elif avg_usage and avg_usage < 2:
                msg = f"Low usage of {appliance} (~{avg_usage} hrs/day). Great efficiency!"
            else:
                msg = f"Moderate usage of {appliance} (~{avg_usage} hrs/day)."
            if avg_units and avg_units > 5:
                msg += f" Consumes about {avg_units} kWh/day — try operating during off-peak hours."
            recommendations.append({
                "appliance": appliance, "avg_usage": avg_usage,
                "avg_units": avg_units, "recommendation": msg
            })
        return jsonify({"recommendations": recommendations})
    except Exception as e:
        return jsonify({"error": f'Error generating recommendations: {str(e)}'}), 500

# --- NEW: DELETE DATA ROUTE ---
@app.route('/api/delete_data', methods=['DELETE'])
@jwt_required()
def delete_data():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    ids_to_delete = data.get('ids') # This will be a list of data_ids

    if not ids_to_delete:
        return jsonify({"error": "No IDs provided"}), 400

    try:
        # This is the key: it filters by the user's ID *and* the list of row IDs.
        # This prevents a user from deleting data they don't own.
        num_deleted = db.session.query(DailyData).filter(
            DailyData.user_id == user_id,
            DailyData.data_id.in_(ids_to_delete)
        ).delete(synchronize_session=False)
        
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully deleted {num_deleted} entries."
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# --- MAIN RUNNER ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all() 
    app.run(debug=True, port=5000)