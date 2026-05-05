# Seed AI Platform 🌱

[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.3-blue?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![ESP32](https://img.shields.io/badge/ESP32-IoT-red?logo=espressif)](https://www.espressif.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/your-username/seed-ai-platform?style=social)](https://github.com/your-username/seed-ai-platform)

An AI-powered IoT platform for intelligent seed quality analysis and germination chamber monitoring. Combines real-time sensor dashboard, ML inference, WebSocket updates, and secure authentication for local-first smart agriculture.

**Perfect for**: Lab prototypes, college projects, greenhouse experiments, precision farming research, and IoT demonstrations.

## 🚀 Quick Start

```powershell
# Clone and setup
git clone https://github.com/your-username/seed-ai-platform.git
cd seed-ai-platform

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
cd backend && pip install -r requirements.txt && cd ..
cd frontend && npm install && cd ..

# Run the project
.\run-project.ps1
```

**Access the dashboard**: [http://localhost:5173](http://localhost:5173)  
**Login**: `admin` / `admin123`  
**API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

📖 **[Full Setup Guide](SETUP.md)** | 🤝 **[Contributing Guide](CONTRIBUTING.md)**

---

## 📋 Table of Contents

- [About](#about)
- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Hardware Setup](#-hardware-setup)
- [API Documentation](#-api-documentation)
- [Technologies](#-technologies)
- [License](#-license)
- [Contributing](#-contributing)

---

## About

**Seed AI Platform** is a local-first smart agriculture solution designed for seed germination monitoring and analysis. It features an IoT-enabled sensor dashboard, real-time ML predictions, and secure user management—ideal for research labs, greenhouses, and precision farming applications.

## Project Goal: Two-Chamber Seed Quality System

This project is built around two chambers:

1. Chamber 1: Live Sensor Chamber
   - Collects live environmental values from sensors.
   - Reads temperature, humidity, and soil/growth-medium moisture.
   - Sends readings from ESP32 to the FastAPI backend.
   - Shows live values on the dashboard.
   - Helps identify whether the seed environment is healthy for germination.

2. Chamber 2: Seed Quality Chamber
   - Used for seed quality checking.
   - Accepts seed image upload for image-based quality prediction.
   - Can also use Chamber 1 sensor values as environmental features for seed quality prediction.
   - Gives germination probability, quality label, confidence, and recommendation.

The final idea is:

```text
Live sensor values from Chamber 1
        +
Seed image / seed quality label from Chamber 2
        |
        v
AI model predicts seed quality and germination condition
        |
        v
Dashboard displays live chamber health + seed quality result
```

In simple words: Chamber 1 tells us the growing condition, and Chamber 2 tells us the seed quality. Together, they help predict whether seeds are likely to germinate well.

## 🎯 Features

### 🔐 Authentication & Security
- JWT-based secure login
- Admin and user role support
- Password hashing with bcrypt
- Protected API endpoints

### 📊 Real-Time Monitoring
- Live sensor dashboard (temperature, humidity, moisture)
- WebSocket-powered real-time updates
- Interactive Recharts visualizations
- Dynamic chart range controls (30/60/120 points)
- AI-powered health insights

### 🌾 Seed Analysis
- Seed image upload and analysis
- Germination probability prediction
- Quality label classification
- Model confidence scoring
- Prediction history tracking

### 🔧 Hardware Integration
- ESP32 Wi-Fi connectivity
- DHT22 temperature/humidity sensor support
- Capacitive soil moisture sensors
- HTTP POST data pipeline
- Manual sensor data entry (demo mode)

### 💾 Data Management
- SQLite local database
- Historical data tracking
- Sensor reading persistence
- Alert system

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Seed AI Platform                          │
└─────────────────────────────────────────────────────────────┘
                          │
                ┌─────────┼─────────┐
                │         │         │
                v         v         v
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │ ESP32    │ │ Manual   │ │ Mobile   │
         │ Sensors  │ │ Entry    │ │ App      │
         └──────────┘ └──────────┘ └──────────┘
                │         │         │
                └─────────┼─────────┘
                          │
                          v
        ┌──────────────────────────────────┐
        │     FastAPI Backend (8000)       │
        │  ┌────────────────────────────┐  │
        │  │ Authentication (JWT)        │  │
        │  │ Sensor Management           │  │
        │  │ ML Inference Engine         │  │
        │  │ WebSocket Live Updates      │  │
        │  │ Database Driver (SQLite)    │  │
        │  └────────────────────────────┘  │
        └──────────────────────────────────┘
                │              │
                │              │
         WebSocket            SQL
         (Real-time)      (Persistent)
                │              │
                │              v
                │        ┌──────────────┐
                │        │  SQLite DB   │
                │        │  (Local)     │
                │        └──────────────┘
                │
                v
    ┌────────────────────────────────┐
    │  React Dashboard (5173)         │
    │  ┌──────────────────────────┐   │
    │  │ Login Page               │   │
    │  │ Sensor Dashboard         │   │
    │  │ Real-time Charts         │   │
    │  │ Seed Analysis Panel      │   │
    │  │ Prediction History       │   │
    │  └──────────────────────────┘   │
    └────────────────────────────────┘
```

### System Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend API** | FastAPI + Uvicorn | RESTful API, WebSocket server, ML inference |
| **Frontend** | React 18 + Vite + Recharts | Interactive dashboard, real-time visualizations |
| **Database** | SQLite | Local persistent storage |
| **Authentication** | JWT + Passlib | Secure user management |
| **IoT Hardware** | ESP32 + DHT22 + Moisture Sensor | Real-time environmental monitoring |
| **ML Models** | PyTorch + scikit-learn | Seed quality prediction, image classification |

---

## 📁 Project Structure

```
SeedAIPlatform/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── api/               # API route handlers
│   │   │   ├── auth.py        # Authentication endpoints
│   │   │   ├── sensors.py     # Sensor data endpoints
│   │   │   └── seed.py        # Seed prediction endpoints
│   │   ├── core/              # Configuration
│   │   │   └── config.py      # Settings & environment
│   │   ├── db/                # Database
│   │   │   └── database.py    # SQLite setup
│   │   ├── models/            # Data schemas
│   │   │   └── schemas.py     # Pydantic models
│   │   ├── services/          # Business logic
│   │   │   ├── auth.py        # Authentication logic
│   │   │   ├── ml_inference.py# ML prediction service
│   │   │   └── realtime.py    # WebSocket manager
│   │   └── main.py            # App entry point
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example           # Environment template
│   └── artifacts/             # ML model storage
│
├── frontend/                   # React + Vite application
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   │   ├── MetricCard.jsx # Sensor metric display
│   │   │   ├── Sidebar.jsx    # Navigation sidebar
│   │   │   └── ProtectedRoute.jsx # Auth wrapper
│   │   ├── pages/             # Page components
│   │   │   ├── LoginPage.jsx  # Authentication page
│   │   │   └── DashboardPage.jsx # Main dashboard
│   │   ├── services/
│   │   │   └── api.js         # API client (axios)
│   │   ├── styles/            # CSS stylesheets
│   │   └── App.jsx            # Root component
│   ├── package.json           # Node dependencies
│   ├── vite.config.js         # Vite configuration
│   └── index.html             # HTML entry point
│
├── ml/                        # Machine learning scripts
│   ├── train_seed_quality_model.py
│   ├── prepare_quality_dataset.py
│   ├── retrain_calibrated_model.py
│   └── test_inference_api.py
│
├── esp32/                     # ESP32 Arduino code
│   └── esp32_seed_chamber_http_post.ino
│
├── run-project.ps1           # One-click startup script
├── README.md                 # This file
├── SETUP.md                  # Detailed setup guide
├── CONTRIBUTING.md           # Contributing guidelines
├── LICENSE                   # MIT License
└── .gitignore               # Git ignore rules
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**
- **Git**
- **Windows PowerShell 5+** (or Bash on Linux/Mac)

### Installation Steps

**1. Clone the repository**
```bash
git clone https://github.com/your-username/seed-ai-platform.git
cd seed-ai-platform
```

**2. Set up Python backend**
```powershell
# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
cd backend
pip install -r requirements.txt
cd ..
```

**3. Set up Node.js frontend**
```powershell
cd frontend
npm install
cd ..
```

**4. Configure environment**
```powershell
# Copy environment template
Copy-Item backend\.env.example backend\.env

# Edit .env with your settings (change SECRET_KEY for production)
```

**5. Run the application**
```powershell
.\run-project.ps1
```

Open [http://localhost:5173](http://localhost:5173) and login with:
- **Username**: `admin`
- **Password**: `admin123`

For detailed setup instructions, see [SETUP.md](SETUP.md).

---

## 📡 Hardware Setup

### Required Components

| Component | Model | Purpose |
|-----------|-------|---------|
| Microcontroller | ESP32 DevKit V1 | WiFi-enabled IoT hub |
| Temperature/Humidity | DHT22 | ±0.5°C accuracy |
| Soil Moisture | Capacitive Sensor | Non-corrosive measurement |
| Connections | Jumper wires + breadboard | Prototyping |
| Power | USB or 5V adapter | Supply voltage |

### ESP32 Connection Diagram

```
ESP32 DevKit Pinout:
═══════════════════════════════════════
    
    DHT22 Sensor (Temp + Humidity):
    ┌─────────────────────┐
    │ VCC → 3.3V (or 5V)  │
    │ DATA → GPIO 4       │
    │ GND → GND           │
    └─────────────────────┘
    
    Soil Moisture Sensor:
    ┌─────────────────────┐
    │ VCC → 3.3V (or 5V)  │
    │ A0 → GPIO 34 (ADC)  │
    │ GND → GND           │
    └─────────────────────┘
```

### Upload ESP32 Firmware

1. **Install Arduino IDE** and ESP32 board support
2. **Edit ESP32 code** (`esp32/esp32_seed_chamber_http_post.ino`):
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* serverUrl = "http://YOUR_PC_IP:8000/api/sensors/ingest";
   ```

3. **Find your PC's IP address**:
   ```powershell
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

4. **Upload to ESP32** via Arduino IDE

For complete hardware guide, see [SETUP.md → ESP32 Configuration](SETUP.md#esp32-configuration).

---

## 🔌 API Documentation

### Authentication Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | Create new user |
| GET | `/api/auth/me` | Get current user |

### Sensor Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/sensors/ingest` | Submit sensor reading |
| GET | `/api/sensors/latest` | Get latest readings |
| GET | `/api/sensors/history` | Historical data |
| WS | `/api/sensors/ws?token=<JWT>` | WebSocket live feed |

### Seed Prediction Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/seeds/predict-seed` | Analyze seed image |
| GET | `/api/seeds/history` | Prediction history |

**Full API documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) (Swagger UI)

---

## 🛠️ Technologies

### Backend Stack
- **FastAPI** - Modern async web framework
- **Uvicorn** - ASGI server
- **SQLAlchemy** - ORM
- **Pydantic** - Data validation
- **PyJWT** - Token authentication
- **Passlib** - Password hashing
- **PyTorch** - Deep learning
- **scikit-learn** - ML inference

### Frontend Stack
- **React 18** - UI library
- **Vite** - Build tool
- **Axios** - HTTP client
- **React Router** - Navigation
- **Recharts** - Data visualization

### Hardware & IoT
- **ESP32** - Microcontroller
- **DHT22** - Temperature/humidity sensor
- **Capacitive Moisture Sensor** - Soil monitoring

---

## 📊 Use Cases

✅ **Smart Greenhouse Monitoring** - Real-time environment tracking  
✅ **Seed Quality Research** - Image-based analysis & prediction  
✅ **Lab Prototyping** - IoT project development  
✅ **College Projects** - Full-stack education platform  
✅ **Precision Farming** - Data-driven agriculture  
✅ **Hardware Integration** - ESP32 + sensor examples  

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Coding standards
- Pull request process
- Issue reporting

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 How It Works

### Data Flow

```
Sensors / ESP32 / Manual Entry
    ↓
POST /api/sensors/ingest
    ↓
Backend validates & stores in SQLite
    ↓
AI engine generates insights
    ↓
WebSocket broadcasts to dashboard
    ↓
React updates real-time cards, charts, insights
```

### Sensor Data Format

```json
{
  "device_id": "esp32-chamber-1",
  "temperature": 28.5,
  "humidity": 65.2,
  "moisture": 45.0
}
```

---

## 🐛 Troubleshooting

**Port already in use?**
```bash
# Change port in run-project.ps1 or run manually
python -m uvicorn app.main:app --port 8001
npm run dev -- --port 5174
```

**Database locked?**
- Restart the backend service
- Check for zombie Python processes

**ESP32 connection fails?**
- Verify Wi-Fi credentials
- Check PC IP address with `ipconfig`
- Ensure backend is running on port 8000

See [SETUP.md → Troubleshooting](SETUP.md#troubleshooting) for more solutions.

---

## 📄 How to Run the Project

### Quick Run

Open PowerShell:

```powershell
cd "E:\IOT project\SeedAIPlatform"
.\run-project.ps1
```

Then open:

```text
http://localhost:5173
```

Default login:

```text
Username: admin
Password: admin123
```

Keep the PowerShell window open while using the dashboard. Press `Ctrl+C` to stop the project.

### Manual Backend Run

Use this if you want to start backend and frontend separately.

```powershell
cd "E:\IOT project\SeedAIPlatform\backend"
python -m uvicorn app.main:app --reload --port 8000
```

Backend URL:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

### Manual Frontend Run

Open another PowerShell window:

```powershell
cd "E:\IOT project\SeedAIPlatform\frontend"
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

---

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

You are free to use, modify, and distribute this software in personal and commercial projects.

### Displaying Real Values on Dashboard

Once the ESP32 code is uploaded and running:

1. Start the backend:
   ```powershell
   cd "E:\IOT project\SeedAIPlatform\backend"
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. Start the frontend:
   ```powershell
   cd "E:\IOT project\SeedAIPlatform\frontend"
   npm run dev
   ```

3. Open the dashboard:
   ```
   http://localhost:5173
   ```

4. Login with:
   - Username: admin
   - Password: admin123

5. Go to the **Sensor Chamber** tab:

   The dashboard will automatically show:
   - **Live Temperature** - updates every 10 seconds
   - **Live Humidity** - updates every 10 seconds
   - **Live Moisture** - updates every 10 seconds
   - **Chamber Health Status** - Optimal, Watch, or Needs Attention
   - **Real-time Chart** - temperature, humidity, moisture trends
   - **AI Insights** - automatic recommendations based on sensor readings

### Troubleshooting Real Sensor Data

If the dashboard doesn't show sensor values:

1. **Check ESP32 Serial Monitor** (Arduino IDE > Tools > Serial Monitor):
   - Should show temperature, humidity, moisture readings
   - Should show "HTTP Response code: 200" for success

2. **Check backend is receiving data**:
   ```powershell
   Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/sensors/latest" -Method GET
   ```
   
   Should return the latest sensor reading.

3. **Common issues**:
   - ESP32 not connected to Wi-Fi → Check ssid/password
   - Wrong IP address → Update serverUrl with your PC's IP
   - Firewall blocking → Disable Windows Firewall temporarily
   - Sensors not responding → Check wiring connections

### Expected Dashboard Values

Once connected, the dashboard will display:

| Sensor | Healthy Range | Warning Range | Critical Range |
|--------|---------------|---------------|----------------|
| Temperature | 24-32°C | 20-24°C or 32-34°C | <20°C or >34°C |
| Humidity | 55-70% | 45-55% or 70-78% | <45% or >78% |
| Moisture | 45-65% | 35-45% or 65-75% | <35% or >75% |

The **Chamber Health** indicator shows:
- 🟢 **Optimal** - All values in healthy range
- 🟡 **Watch** - One or more values slightly outside range
- 🔴 **Needs Attention** - One or more values in critical range

## How to Predict Seed Quality Using Live Sensor Values

There are two levels of prediction in this project.

### Current Working Prediction

The current app already supports:

1. Chamber 1 sensor monitoring:
   - Temperature.
   - Humidity.
   - Moisture.
   - Chamber health.
   - AI insights.

2. Chamber 2 seed image prediction:
   - Upload seed image.
   - Predict germination probability.
   - Predict quality label.
   - Show recommendation.

This means the dashboard can show live growing conditions and seed quality results together.

### Sensor-Based Seed Quality Prediction Goal

To predict seed quality directly through sensors, collect a dataset where each row connects sensor readings with a known seed result.

Example dataset:

```csv
temperature,humidity,moisture,exposure_hours,seed_type,germination_probability,quality_label
28.5,62.0,56.0,24,wheat,91,Good
35.8,66.0,42.0,24,wheat,61,Average
31.2,45.0,26.0,24,wheat,38,Poor
```

Recommended columns:

- `temperature`: live temperature from Chamber 1.
- `humidity`: live humidity from Chamber 1.
- `moisture`: live moisture from Chamber 1.
- `exposure_hours`: how long seeds stayed in those chamber conditions.
- `seed_type`: wheat, maize, rice, etc.
- `germination_probability`: real observed germination result.
- `quality_label`: `Good`, `Average`, or `Poor`.

### Two-Chamber Workflow for Sensor-Based Prediction

Use this workflow:

1. Put seeds in Chamber 1.
2. ESP32 sends live sensor values every few seconds or minutes.
3. Backend stores those values in SQLite.
4. Keep seeds under those conditions for a known time period.
5. Move/check seeds in Chamber 2.
6. Record real quality result:
   - Good.
   - Average.
   - Poor.
   - Germination percentage.
7. Export the combined dataset.
8. Train an ML model using sensor values as inputs.
9. Use the trained model in the backend to predict quality from live sensor readings.
10. Show that prediction on the dashboard.

### Example Sensor Prediction Input

The AI model can receive:

```json
{
  "temperature": 29.4,
  "humidity": 62.8,
  "moisture": 54.2,
  "exposure_hours": 24,
  "seed_type": "wheat"
}
```

Expected output:

```json
{
  "germination_probability": 88,
  "quality_label": "Good",
  "recommendation": "Conditions are suitable. Continue monitoring moisture."
}
```

### Simple Rule-Based Prediction Before ML Training

Before you have enough training data, use rules:

- Moisture below 35% usually means dry stress and lower germination.
- Temperature above 34 C can reduce seed quality.
- Humidity above 78% may increase fungal risk.
- Temperature around 24-32 C, humidity around 55-70%, and moisture around 45-65% is a healthy range.

Example rule:

```text
If moisture is 45-65%, temperature is 24-32 C, and humidity is 55-70%:
  Predict Good seed environment
Else if one value is slightly outside range:
  Predict Average risk
Else:
  Predict Poor/high-risk condition
```

### Best Final Model

For a strong final version, train a model with:

- Inputs:
  - temperature
  - humidity
  - moisture
  - exposure_hours
  - seed_type
- Outputs:
  - germination_probability
  - quality_label

Good model choices:

- Random Forest for tabular sensor data.
- Gradient Boosting for better accuracy.
- Logistic Regression for a simple baseline.
- Neural network only if you collect a larger dataset.

For best accuracy, combine both:

```text
Sensor model prediction + seed image model prediction = final seed quality decision
```

This is the strongest two-chamber approach because sensors describe the environment, and the seed image describes the physical seed condition.

## Insert Live Sensor Data Manually

You can test the dashboard without ESP32 by sending sample sensor readings.

Open PowerShell:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/sensors/ingest" `
  -ContentType "application/json" `
  -Body '{"device_id":"demo-chamber-1","temperature":29.4,"humidity":62.8,"moisture":54.2}'
```

After running this command:

- The backend stores the reading.
- The dashboard updates automatically.
- The chart gets a new point.
- The AI insights update if thresholds are crossed.

### More Sample Sensor Readings

Healthy chamber:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/sensors/ingest" `
  -ContentType "application/json" `
  -Body '{"device_id":"demo-healthy","temperature":28.6,"humidity":62.5,"moisture":57.8}'
```

Dry soil condition:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/sensors/ingest" `
  -ContentType "application/json" `
  -Body '{"device_id":"demo-dry","temperature":31.8,"humidity":48.4,"moisture":28.5}'
```

Heat stress condition:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/sensors/ingest" `
  -ContentType "application/json" `
  -Body '{"device_id":"demo-heat","temperature":36.4,"humidity":66.1,"moisture":43.2}'
```

## Insert Sensor Data From the Dashboard

Login as admin:

```text
admin / admin123
```

Then:

1. Open `Sensor Chamber`.
2. Go to `Admin Sensor Studio`.
3. Click `Healthy`, `Dry Soil`, or `Heat Stress` to add instant demo data.
4. Or type custom values for temperature, humidity, and moisture.
5. Click `Push Data`.

This is useful when demonstrating the project without hardware.

## Connect ESP32 for Live Sensor Data

Use the firmware file:

```text
SeedAIPlatform/esp32/esp32_seed_chamber_http_post.ino
```

### ESP32 Sensor Hardware

Typical sensors:

- DHT11 or DHT22 for temperature and humidity.
- Capacitive soil moisture sensor for soil moisture.
- ESP32 board with Wi-Fi.

### ESP32 Data Flow

```text
DHT sensor + moisture sensor
        |
        v
ESP32 reads sensor values
        |
        v
ESP32 sends HTTP POST JSON
        |
        v
FastAPI /api/sensors/ingest
        |
        v
Dashboard updates live
```

### Find Your PC IP Address

Your ESP32 must send data to your computer's local IP address, not `localhost`.

On Windows PowerShell:

```powershell
ipconfig
```

Look for the IPv4 address under Wi-Fi. Example:

```text
IPv4 Address . . . . . . . . . . . : 172.20.10.5
```

Then your backend URL for ESP32 is:

```text
http://172.20.10.5:8000/api/sensors/ingest
```

### ESP32 JSON Format

Your ESP32 should send:

```json
{
  "device_id": "esp32-chamber-1",
  "temperature": 30.5,
  "humidity": 61.2,
  "moisture": 57
}
```

### ESP32 HTTP Request Headers

Required:

```text
Content-Type: application/json
```

Optional, only if you enable device authentication:

```text
x-device-token: your-device-token
```

### Device Token Security

By default, device token authentication is disabled.

To enable it, create or edit:

```text
SeedAIPlatform/backend/.env
```

Add:

```env
DEVICE_TOKEN=my-secret-device-token
```

Then the ESP32 must send the same token in the `x-device-token` header.

## How the Dashboard Displays Live Sensor Data

The dashboard loads and updates data in three ways:

1. Initial load:
   - Calls `GET /api/sensors/latest`.
   - Calls `GET /api/sensors/history`.
   - Displays current values and previous chart points.

2. Real-time updates:
   - Opens WebSocket connection to `WS /api/sensors/ws?token=<jwt>`.
   - Whenever new data is posted to `/api/sensors/ingest`, the backend broadcasts it.
   - The frontend adds the new point to the chart immediately.

3. Periodic refresh:
   - The frontend refreshes sensor data every 10 seconds.
   - This keeps the dashboard correct even if WebSocket reconnects or the page was inactive.

## Sensor Dashboard Features Explained

### Chamber Health Hero

Shows the overall chamber condition:

- `Optimal`: values are in the healthy germination range.
- `Watch`: values are usable but drifting from ideal.
- `Needs Attention`: temperature, humidity, or moisture is outside the safe target range.

### Metric Cards

Cards show:

- Current temperature.
- Current humidity.
- Current soil moisture.
- Average value from loaded history.
- Target range.

Click a card to focus that metric.

### Focus Panel

The focus panel shows:

- Selected metric.
- Current value.
- Ideal range.
- Progress bar.
- Advice for that signal.
- Latest device source.

### Real-Time Chart

The chart displays:

- Temperature.
- Humidity.
- Soil moisture.

Interactive controls:

- `30`, `60`, `120`: choose number of history points.
- `Temperature`, `Humidity`, `Moisture`: toggle each signal on or off.

### AI Insights

The backend generates rule-based insights using sensor thresholds.

Examples:

- Soil too dry: irrigation or watering recommendation.
- Temperature too high: germination stress warning.
- Humidity too high: fungal risk warning.
- Healthy values: chamber is stable.

### Admin Sensor Studio

Admin users can:

- Push custom sensor values.
- Add instant sample data.
- Simulate healthy or problem conditions.

This is helpful for presentations and testing.

## Seed Analysis Features Explained

The Seed Analysis page lets you upload an image and receive:

- Germination probability.
- Quality label.
- Confidence percentage.
- Raw class.
- Recommendation.
- Prediction history.

Flow:

```text
Image upload
    |
    v
POST /api/seeds/predict-seed
    |
    v
Backend runs ML inference
    |
    v
Result saved in SQLite
    |
    v
Dashboard displays prediction
```

## Share the Dashboard With Friends on Same Wi-Fi

Your friends can open the dashboard if:

- They are on the same Wi-Fi or mobile hotspot.
- Your laptop is running the backend and frontend.
- Windows Firewall allows Python and Node.js.

Find your IP:

```powershell
ipconfig
```

Run frontend with LAN access:

```powershell
cd "E:\IOT project\SeedAIPlatform\frontend"
npm run dev -- --host 0.0.0.0
```

Run backend with LAN access:

```powershell
cd "E:\IOT project\SeedAIPlatform\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Share this link, replacing `YOUR_PC_IP`:

```text
http://YOUR_PC_IP:5173
```

Example:

```text
http://172.20.10.5:5173
```

For friends outside your Wi-Fi, you need public deployment or a tunnel service.

## API Summary

### Auth

```text
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
GET  /api/auth/users
```

### Sensors

```text
POST /api/sensors/ingest
GET  /api/sensors/latest
GET  /api/sensors/history
WS   /api/sensors/ws?token=<jwt>
```

### Seed Analysis

```text
POST /api/seeds/predict-seed
GET  /api/seeds/history
```

## Example Sensor API Test With curl

```bash
curl -X POST http://127.0.0.1:8000/api/sensors/ingest \
  -H "Content-Type: application/json" \
  -d "{\"device_id\":\"curl-demo\",\"temperature\":29.4,\"humidity\":63.1,\"moisture\":55.0}"
```

## Environment Variables

Backend `.env` options:

```env
SECRET_KEY=change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
SQLITE_PATH=./seed_platform.db
ML_MODEL_PATH=../../ML work/defect_classifier.pth
CALIBRATED_MODEL_PATH=./artifacts/seed_quality_calibrated.joblib
DEVICE_TOKEN=
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Frontend `.env` option:

```env
VITE_API_URL=http://127.0.0.1:8000
```

If you run over LAN, set `VITE_API_URL` to your PC IP:

```env
VITE_API_URL=http://YOUR_PC_IP:8000
```

## ML Usage

### Current Inference Behavior

- Backend loads the calibrated model from `CALIBRATED_MODEL_PATH`.
- If unavailable, it tries the configured model path.
- If no model is found, fallback logic keeps the dashboard usable.

### Prepare Quality Dataset

```bash
python ml/prepare_quality_dataset.py --source "../ML work/ml/data/seed_images" --output "./dataset"
```

### Train Quality Model

Requires:

```text
dataset/Good
dataset/Average
dataset/Poor
```

Command:

```bash
python ml/train_seed_quality_model.py --dataset ./dataset --epochs 20 --output ./seed_quality_mobilenet.pth
```

### API Inference Smoke Test

```bash
python ml/test_inference_api.py --image "path/to/test_image.jpg"
```

## Troubleshooting

### Frontend does not open

Make sure Vite is running:

```powershell
cd "E:\IOT project\SeedAIPlatform\frontend"
npm run dev
```

Open:

```text
http://localhost:5173
```

### Backend does not respond

Run:

```powershell
cd "E:\IOT project\SeedAIPlatform\backend"
python -m uvicorn app.main:app --reload --port 8000
```

Check:

```text
http://127.0.0.1:8000/health
```

### Dashboard shows no sensor values

Send sample data:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/sensors/ingest" `
  -ContentType "application/json" `
  -Body '{"device_id":"demo","temperature":29,"humidity":60,"moisture":55}'
```

### ESP32 cannot send data

Check:

- ESP32 and laptop are on the same Wi-Fi.
- Backend is running with `--host 0.0.0.0`.
- ESP32 uses laptop IP, not `localhost`.
- Firewall allows Python.
- URL is correct: `http://YOUR_PC_IP:8000/api/sensors/ingest`.
- JSON field names are exactly `device_id`, `temperature`, `humidity`, and `moisture`.

### Friends cannot open dashboard

Check:

- They are on the same Wi-Fi or hotspot.
- Frontend is running with `--host 0.0.0.0`.
- You shared `http://YOUR_PC_IP:5173`.
- Firewall allows Node.js.

## Default Credentials

```text
Username: admin
Password: admin123
```

The default admin account is created automatically on first backend startup.

## Notes

- This project is local-first and does not require cloud services.
- SQLite is used for easy local development.
- ESP32 can push real sensor data through HTTP.
- WebSocket updates make the dashboard feel live.
- The dashboard can also be demonstrated without hardware using manual sensor push.
- For production, change `SECRET_KEY`, set a strong admin password, and configure secure deployment.
