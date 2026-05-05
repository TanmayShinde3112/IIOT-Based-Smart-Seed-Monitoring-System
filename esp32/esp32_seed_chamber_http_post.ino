#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"

// WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend endpoint (same network as ESP32)
const char* BACKEND_URL = "http://192.168.1.100:8000/api/sensors/ingest";

// Optional device token from backend .env (leave empty if not used)
const char* DEVICE_TOKEN = "";

#define DHTPIN 4
#define DHTTYPE DHT11
#define SOIL_PIN 34

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL_MS = 5000;

void setup() {
  Serial.begin(115200);
  delay(1000);
  dht.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long now = millis();
  if (now - lastSend < SEND_INTERVAL_MS) {
    return;
  }
  lastSend = now;

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  int soilRaw = analogRead(SOIL_PIN);
  int soilMoisture = map(soilRaw, 4095, 1500, 0, 100);
  soilMoisture = constrain(soilMoisture, 0, 100);

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT read failed. Skipping this cycle.");
    return;
  }

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    if (strlen(DEVICE_TOKEN) > 0) {
      http.addHeader("x-device-token", DEVICE_TOKEN);
    }

    String payload = "{";
    payload += "\"device_id\":\"esp32-chamber-1\",";
    payload += "\"temperature\":" + String(temperature, 2) + ",";
    payload += "\"humidity\":" + String(humidity, 2) + ",";
    payload += "\"moisture\":" + String(soilMoisture);
    payload += "}";

    int code = http.POST(payload);
    String response = http.getString();

    Serial.print("POST code: ");
    Serial.println(code);
    Serial.println(response);

    http.end();
  } else {
    Serial.println("WiFi disconnected, retrying...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}
