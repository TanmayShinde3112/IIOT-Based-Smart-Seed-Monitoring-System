#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"
#include "esp_camera.h"

// AI Thinker ESP32-CAM pin map.
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend endpoints (same network as ESP32)
const char* SENSOR_URL = "http://192.168.1.100:8000/api/sensors/ingest";
const char* SEED_CAPTURE_URL = "http://192.168.1.100:8000/api/seeds/capture?device_id=esp32-cam-1&filename=esp32-seed-frame.jpg";

// Optional device token from backend .env (leave empty if not used)
const char* DEVICE_TOKEN = "";

#define DHTPIN 4
#define DHTTYPE DHT11
#define SOIL_PIN 34

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastSend = 0;
unsigned long lastCapture = 0;
const unsigned long SEND_INTERVAL_MS = 5000;
const unsigned long CAPTURE_INTERVAL_MS = 15000;

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return false;
  }
  return true;
}

void sendSeedCapture() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SEED_CAPTURE_URL);
    http.addHeader("Content-Type", "image/jpeg");

    int code = http.POST(fb->buf, fb->len);
    String response = http.getString();

    Serial.print("Capture POST code: ");
    Serial.println(code);
    Serial.println(response);

    http.end();
  }

  esp_camera_fb_return(fb);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  dht.begin();

  if (!initCamera()) {
    Serial.println("Camera init failed. Check the ESP32-CAM module pin mapping.");
  }

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
    http.begin(SENSOR_URL);
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

  if (now - lastCapture >= CAPTURE_INTERVAL_MS && !isnan(temperature) && !isnan(humidity)) {
    lastCapture = now;
    sendSeedCapture();
  }
}
