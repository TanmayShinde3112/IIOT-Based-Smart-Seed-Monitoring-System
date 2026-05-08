# IIOT-Based-Smart-Seed-Monitoring-System

[![Python](https://img.shields.io/badge/Python-3.x-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![ESP32](https://img.shields.io/badge/ESP32-IoT-FF6F00?logo=espressif&logoColor=white)](https://www.espressif.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Overview

This project is an IoT and machine learning system for seed chamber monitoring and image-based seed quality prediction.

It combines:

- ESP32 sensor telemetry for temperature, humidity, and moisture
- ESP32-CAM image capture for seed inspection
- A FastAPI backend for authentication, storage, and inference
- A React dashboard for live monitoring and prediction display

## What The Dashboard Shows

The dashboard has two main views:

- Sensor view: live chamber readings and charts
- Seed view: manual seed image upload or ESP32-CAM capture preview, latest prediction, and prediction history

When an ESP32-CAM image is posted, it is saved by the backend, predicted, and displayed in the Seed tab as the latest image preview and prediction result.

If you upload a manual image, the same Seed tab shows the uploaded preview and runs prediction from that image as well.

## Features

- Real-time chamber monitoring for temperature, humidity, and moisture
- ESP32 sensor upload using HTTP POST
- ESP32-CAM image capture and automatic prediction
- Manual image upload and prediction in the dashboard
- Latest prediction card with image preview, quality label, confidence, and recommendation
- Prediction history with thumbnails
- JWT authentication and protected endpoints
- SQLite persistence for sensor and prediction records
- Manual sensor entry for demo and testing

## Tech Stack

Backend:

- Python
- FastAPI
- Uvicorn
- SQLite
- JWT authentication
- Passlib

Frontend:

- React
- Vite
- Recharts
- Axios

Hardware:

- ESP32
- ESP32-CAM
- DHT sensor
- Soil moisture sensor

ML and Data:

- Pillow
- NumPy
- scikit-learn
- joblib
- Ultralytics YOLO

## Setup

### Prerequisites

- Python 3.11 or newer
- Node.js 18 or newer
- npm

### Install

Create the backend environment file before starting the servers:

```powershell
Copy-Item backend\.env.example backend\.env
```

Then install dependencies:

```powershell
git clone <your-repository-url>
cd IIOT-Based-Smart-Seed-Monitoring-System

python -m venv .venv
.\.venv\Scripts\Activate.ps1

cd backend
pip install -r requirements.txt
cd ..

cd frontend
npm install
cd ..
```

### Run

Start both services with:

```powershell
.\run-project.ps1
```

Manual start:

```powershell
# Backend
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm run dev
```

Open the app at `http://localhost:5173` and log in with `admin` / `admin123`.

## ESP32-CAM Flow

The ESP32-CAM should post captured JPEG images to:

```text
/api/seeds/capture
```

The backend will:

- save the image
- run prediction on the image
- store the prediction in SQLite
- expose the latest result through `/api/seeds/latest`

In the dashboard, the image appears on the Seed tab in the Seed Camera Capture section and also in Prediction History as a thumbnail.

## Manual Image Prediction

Manual image upload uses the same prediction pipeline as ESP32-CAM images.

If the image is a valid seed photo, the backend accepts it and predicts from the uploaded image. The detector no longer blocks valid seed photos just because detection confidence is low.

## API Endpoints

Authentication:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `GET /api/auth/users`

Sensors:

- `POST /api/sensors/ingest`
- `GET /api/sensors/latest`
- `GET /api/sensors/history`
- `WS /api/sensors/ws?token=<jwt>`

Seed analysis:

- `POST /api/seeds/predict-seed`
- `POST /api/seeds/capture`
- `GET /api/seeds/latest`
- `GET /api/seeds/history`
- `GET /api/seeds/images/{filename}`

## Usage

1. Start the backend and frontend.
2. Log in using the default admin credentials.
3. Open the Seed tab for image prediction.
4. Upload a manual seed image or let the ESP32-CAM send a capture.
5. View the latest prediction and the saved history thumbnail.

## Friend Setup Checklist

If someone clones the repo and wants the ESP32-CAM image to appear on their own dashboard, they should:

1. Clone the repo and create `backend/.env` from `backend/.env.example`.
2. Install backend dependencies with `pip install -r backend/requirements.txt`.
3. Install frontend dependencies with `npm install` inside `frontend`.
4. Start the backend on port `8000` and the frontend on port `5173`.
5. Open the dashboard at `http://localhost:5173` and log in with `admin / admin123` on first run.
6. Find their PC's LAN IP address, then update the ESP32 sketch so `SENSOR_URL` and `SEED_CAPTURE_URL` point to that IP instead of `localhost`.
7. Make sure the ESP32-CAM and the PC are on the same Wi-Fi network.
8. Upload the ESP32 sketch, then trigger a capture to see the seed image in the Seed tab and latest prediction card.

## Troubleshooting

If the image is not showing on the dashboard:

1. Make sure you are on the Seed tab.
2. Confirm the ESP32-CAM is sending JPEG data to `/api/seeds/capture`.
3. Check that the backend is running on `http://127.0.0.1:8000`.
4. Check that `backend/.env` exists.
5. Refresh the Seed tab so the latest prediction is reloaded.

If login fails:

1. Use `admin` / `admin123` on first run.
2. Make sure the backend is running.
3. Confirm the frontend is using the correct `VITE_API_URL`.

## Project Structure

```text
backend/         FastAPI application, APIs, database, and services
frontend/        React dashboard and UI components
ml/              Training and inference scripts
esp32/           ESP32 sensor and camera firmware
SETUP.md         Detailed setup instructions
CONTRIBUTING.md  Contribution guidelines
```

## Notes

- The project is local-first and uses SQLite for storage.
- The dashboard keeps the latest captured seed image visible in the Seed tab.
- The repository now includes both manual upload and ESP32-CAM capture workflows.
