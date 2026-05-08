# Setup Guide - IIOT-Based-Smart-Seed-Monitoring-System

Complete installation and setup instructions for the IIOT-Based-Smart-Seed-Monitoring-System.

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** (with npm)
- **Git**
- **Windows PowerShell** or **Bash** (for scripts)

## Quick Start (Windows PowerShell)

```powershell
# 1. Clone the repository
git clone <your-repository-url>
cd IIOT-Based-Smart-Seed-Monitoring-System

# 2. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3. Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..

# 4. Install frontend dependencies
cd frontend
npm install
cd ..

# 5. Copy environment template
Copy-Item backend\.env.example backend\.env

# 6. Run the project
.\run-project.ps1
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://127.0.0.1:8000
- **Docs**: http://127.0.0.1:8000/docs

**Default Login**: `admin` / `admin123`

## Backend Setup (Manual)

### 1. Create Virtual Environment

```bash
python -m venv .venv

# Activate (Windows)
.\.venv\Scripts\Activate.ps1

# Activate (Linux/Mac)
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings
# Change SECRET_KEY to a secure random string for production
```

### 4. Initialize Database (First Run)

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

The SQLite database will be created automatically on first run.

### 5. Run Backend Server

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

API documentation available at: `http://127.0.0.1:8000/docs`

## Frontend Setup (Manual)

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Access at: `http://localhost:5173`

### 3. Build for Production

```bash
npm run build
```

Output will be in `frontend/dist/`

## ML Models Setup

### Required Models

The project expects the following pre-trained models:

1. **Seed Quality Classifier** (`ML work/defect_classifier.pth`)
   - PyTorch model for seed image classification
   - Used in the Seed tab for quality analysis

2. **Calibrated Quality Predictor** (`backend/artifacts/seed_quality_calibrated.joblib`)
   - Scikit-learn model for germination probability
   - Trained with environmental sensor data

### Using Pre-trained Models

If you have pre-trained models, place them in:
- `ML work/defect_classifier.pth` (PyTorch model)
- `backend/artifacts/seed_quality_calibrated.joblib` (Scikit-learn model)

### Training New Models

See the [ML Training Guide](../ML%20work/ML_TRAINING_GUIDE.md) for instructions on:
- Preparing training datasets
- Training seed quality models
- Training YOLOv8 object detection models
- Converting VOC format annotations to YOLO format

## ESP32 Configuration

### Hardware

- ESP32 development board
- DHT22 temperature/humidity sensor
- Soil moisture sensor
- Connection: USB for programming, Wi-Fi for data transmission

### Upload Firmware

1. Install Arduino IDE or VS Code with Arduino extension
2. Open `esp32/esp32_seed_chamber_http_post.ino`
3. Configure Wi-Fi SSID and password in the sketch
4. Set the backend IP in `SENSOR_URL` and `SEED_CAPTURE_URL`
5. Upload to the ESP32-CAM board

### Data Transmission

The ESP32 sends sensor readings via HTTP POST to:
```
POST http://[backend-host]:8000/api/sensors/ingest
```

Payload format:
```json
{
   "device_id": "esp32_001",
   "temperature": 25.5,
   "humidity": 65.0,
   "moisture": 45.0
}
```

The ESP32-CAM posts a captured JPEG to:
```
POST http://[backend-host]:8000/api/seeds/capture?device_id=esp32-cam-1&filename=esp32-cam-1.jpg
```

Captured images are displayed in the Seed tab preview, the latest prediction card, and the prediction history thumbnails.

## Database

### SQLite Database

The application uses SQLite for local data storage at `seed_platform.db`.

### Database Initialization

The database is created automatically on first run with the following tables:
- **users** - User accounts and authentication
- **sensor_readings** - Historical sensor data
- **seed_predictions** - Seed quality predictions and history

### Resetting the Database

```bash
# Remove the database file (this will delete all data)
rm seed_platform.db

# Restart the backend - a new database will be created
```

## Troubleshooting

### Port Already in Use

If port 8000 or 5173 is already in use:

```bash
# Change the port in run-project.ps1 or run manually:
cd backend
python -m uvicorn app.main:app --port 8001

cd frontend
npm run dev -- --port 5174
```

### Missing ML Models

If you see errors about missing `.pth` or `.joblib` files:
1. Train models using the ML training scripts
2. Or copy pre-trained models to the correct locations
3. Verify paths in `backend/app/core/config.py`

### CORS Errors

If the frontend can't connect to the backend:
1. Check `CORS_ORIGINS` in `.env`
2. Ensure both services are running
3. Verify the backend port in `frontend/src/services/api.js`

### Database Locked

If you get "database is locked" errors:
1. Ensure only one instance of the backend is running
2. Check for zombie Python processes
3. Restart the backend service

## Production Deployment

For production deployments:

1. **Update SECRET_KEY** in `.env` with a secure random string
2. **Set DEBUG=False** in production
3. **Use a production ASGI server** (Gunicorn, Hypercorn)
4. **Configure CORS_ORIGINS** for your domain
5. **Use PostgreSQL** instead of SQLite for better concurrency
6. **Set up HTTPS/SSL** certificates
7. **Enable authentication** and secure endpoints
8. **Configure logging** and monitoring

See deployment documentation for platform-specific guides (Docker, AWS, Azure, etc.).

## Support

For issues and questions:
- Check the [README.md](README.md)
- Review logs in the terminal output
- Check the API documentation at `http://127.0.0.1:8000/docs`
