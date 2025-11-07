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
from werkzeug.utils import secure_filename
from sqlalchemy import func

app = Flask(__name__)
CORS(app) 

# --- DATABASE CONFIGURATION ---
DB_USER = 'postgres'
DB_PASS = 'hemanth%402004' # Your correct password
DB_HOST = 'localhost'
DB_PORT = '5432'
DB_NAME = 'energy_db'

app.config['SQLALCHEMY_DATABASE_URI'] = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-super-secret-random-string' 
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# --- DATABASE MODELS ---
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
# ------------------------------------

# --- HELPER FUNCTION (MODIFIED) ---
def get_user_data_as_dataframe():
    try:
        user_id = int(get_jwt_identity())
        user_data = DailyData.query.filter_by(user_id=user_id).all()

        if user_data:
            df = pd.DataFrame([
                {
                    'Date': r.Date, 'Temperature': r.Temperature, 'Fan': r.Fan, 'Fan_Units': r.Fan_Units,
                    'Refrigerator': r.Refrigerator, 'Fridge_Units': r.Fridge_Units,
                    'AirConditioner': r.AirConditioner, 'AC_Units': r.AC_Units,
                    'Bulb': r.Bulb, 'Bulb_Units': r.Bulb_Units, 'Television': r.Television,
                    'TV_Units': r.TV_Units, 'Monitor': r.Monitor, 'Monitor_Units': r.Monitor_Units,
                    'MotorPump': r.MotorPump, 'Motor_Units': r.Motor_Units, 'Month': r.Month,
                    'Units': r.Units, 'Extra': r.Extra, 'TariffRate': r.TariffRate,
                    'ElectricityBill': r.ElectricityBill
                } for r in user_data
            ])
            df['Date'] = pd.to_datetime(df['Date'])
            df = df.set_index('Date').sort_index()
            return df, None

        return None, (jsonify({'error': 'No data found. Please enter data manually.'}), 404)
        
    except Exception as e:
        return None, (jsonify({'error': f'Error finding dataset: {str(e)}'}), 500)

# --- AUTHENTICATION ROUTES (Unchanged) ---
@app.route('/api/register', methods=['POST'])
def register():
    # ... (code is unchanged)
    data = request.get_json()
    user_by_email = User.query.filter_by(email=data['email']).first()
    user_by_username = User.query.filter_by(username=data['username']).first()
    if user_by_email:
        return jsonify({"message": "Email already registered"}), 409
    if user_by_username:
        return jsonify({"message": "Username already taken"}), 409
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(username=data['username'], email=data['email'], password_hash=hashed_password, role='user')
    db.session.add(new_user) 
    db.session.commit()
    return jsonify({"message": "User created successfully"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    # ... (code is unchanged)
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "User not found"}), 404
    if bcrypt.check_password_hash(user.password_hash, password):
        identity = str(user.user_id) 
        additional_claims = {'email': user.email, 'role': user.role}
        access_token = create_access_token(identity=identity, additional_claims=additional_claims)
        return jsonify({"message": "Login successful", "access_token": access_token}), 200
    else:
        return jsonify({"message": "Invalid email or password"}), 401

# --- DATASET ROUTES ---

# --- NEW HELPER FUNCTION TO FIX THE ERROR ---
def get_float_or_none(value):
    """Converts empty strings or None to None, otherwise to float."""
    if value is None or value == '':
        return None
    try:
        return float(value)
    except ValueError:
        return None # Handle if text is sent by mistake
        
def get_int_or_none(value):
    """Converts empty strings or None to None, otherwise to int."""
    if value is None or value == '':
        return None
    try:
        return int(value)
    except ValueError:
        return None
# -----------------------------------------

# --- NEW ROUTE FOR MANUAL DATA (THIS IS FIXED) ---
@app.route('/api/add_daily_data', methods=['POST'])
@jwt_required()
def add_daily_data():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()

        if not data.get('Date'):
            return jsonify({'error': 'Date is required.'}), 400
        if data.get('Units') is None:
             return jsonify({'error': 'Units is required.'}), 400

        # Use the helper function to safely convert all number fields
        new_data_entry = DailyData(
            user_id=user_id,
            Date=datetime.datetime.strptime(data.get('Date'), '%Y-%m-%d').date(),
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

# This /upload route is no longer used by the app, but we can leave it
@app.route('/upload', methods=['POST'])
@jwt_required() 
def upload_file():
    return jsonify({'error': 'This route is deprecated. Please use manual entry.'}), 405

# --- DATA/FORECAST ROUTES (MODIFIED) ---
@app.route('/data', methods=['GET'])
@jwt_required()
def get_data():
    df, error = get_user_data_as_dataframe()
    if error:
        return error

    try:
        df = df.ffill().bfill()
        data = {
            'time_series': df.reset_index().to_dict(orient='records'),
            'summary': df.describe().to_dict(),
            'columns': df.columns.tolist()
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': f'Error processing data file: {str(e)}'}), 500

@app.route('/forecast', methods=['GET'])
@jwt_required() 
def get_forecast():
    df, error = get_user_data_as_dataframe()
    if error:
        return error

    try:
        series = df['Units'].ffill().bfill() 
        series_daily = series.resample('D').sum().ffill().bfill()
        
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
    
# --- MAIN RUNNER ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  
    app.run(debug=True)