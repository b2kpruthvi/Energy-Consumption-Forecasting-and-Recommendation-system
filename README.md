# Energy Consumption Forecasting and Recommendation System

An AI-powered web application that forecasts household energy consumption and provides personalized energy-saving recommendations. The system leverages machine learning to predict appliance-level electricity usage and helps users optimize energy consumption through interactive dashboards and actionable insights.

---

## Overview

This project is designed to analyze historical household energy consumption data and predict future electricity usage at the appliance level. It also generates intelligent recommendations to help users reduce energy consumption and improve efficiency.

---

## Features

- Energy consumption forecasting using Machine Learning
- Appliance-wise energy usage analysis
- Interactive charts and visualizations
- Personalized energy-saving recommendations
- Upload and analyze energy consumption datasets
- Historical consumption trend analysis
- Responsive web interface
- Secure data storage with PostgreSQL

---

## Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Recharts

### Backend
- FastAPI
- Python
- REST APIs

### Machine Learning
- Scikit-learn
- SARIMAX
- Random Forest Regressor
- XGBoost
- Pandas
- NumPy

### Database
- PostgreSQL
- SQLAlchemy

---

## Project Architecture

```
Frontend (React)
        │
        ▼
REST API (FastAPI)
        │
        ▼
Machine Learning Models
(SARIMAX / Random Forest / XGBoost)
        │
        ▼
PostgreSQL Database
```

---

## Project Structure

```
Energy-Consumption-Forecasting-and-Recommendation-System
│
├── frontend/
├── backend/
│   ├── routers/
│   ├── models/
│   ├── services/
│   └── main.py
│
├── dataset/
├── trained_models/
├── notebooks/
├── requirements.txt
└── README.md
```

---

## Dataset

The dataset contains appliance-level electricity consumption records along with environmental and household information.

### Dataset Attributes

- Home ID
- Date
- Time
- Appliance Type
- Energy Consumption (kWh)
- Outdoor Temperature
- Season
- Household Size

---

## Machine Learning Workflow

1. Data Collection
2. Data Cleaning
3. Feature Engineering
4. Model Training
5. Model Evaluation
6. Forecast Generation
7. Recommendation Generation
8. Dashboard Visualization

---

## Models Used

- SARIMAX
- Random Forest Regressor
- XGBoost

### Evaluation Metrics

- RMSE
- MAE
- MAPE

---

## Recommendation Engine

The recommendation system analyzes appliance-level energy consumption and provides suggestions such as:

- Identifying high energy-consuming appliances
- Optimizing appliance usage schedules
- Reducing unnecessary electricity consumption
- Improving overall household energy efficiency

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/Pruthvi654/Energy-Consumption-Forecasting-and-Recommendation-system.git
```

### Navigate to the Project Directory

```bash
cd Energy-Consumption-Forecasting-and-Recommendation-system
```

### Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### Run the Backend

```bash
uvicorn main:app --reload
```

### Run the Frontend

```bash
npm install
npm run dev
```

---

## Future Enhancements

- Real-time smart meter integration
- IoT device connectivity
- Mobile application support
- Deep learning-based forecasting
- Electricity bill prediction
- AI-powered virtual assistant

---

## Contributors

- Hemanth Gowda
- Pruthviraj K
- Karthik R V
- Nitheesh Gowda G S

---

## License

This project is developed for educational and research purposes.

---

## Acknowledgement

If you find this project useful, consider starring the repository and sharing your feedback.
