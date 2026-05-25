#include "web_service.h"

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>

#include "app_config.h"
#include "logger.h"
#include "uart_service.h"

static WebServer server(8000);

static void addCorsHeaders()
{
  server.sendHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  server.sendHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.sendHeader("Access-Control-Allow-Credentials", "false");
}

static const char *wifiStatusText(wl_status_t status)
{
  switch (status)
  {
  case WL_NO_SHIELD:
    return "no shield";
  case WL_IDLE_STATUS:
    return "idle";
  case WL_NO_SSID_AVAIL:
    return "ssid unavailable";
  case WL_SCAN_COMPLETED:
    return "scan completed";
  case WL_CONNECTED:
    return "connected";
  case WL_CONNECT_FAILED:
    return "connect failed";
  case WL_CONNECTION_LOST:
    return "connection lost";
  case WL_DISCONNECTED:
    return "disconnected";
  default:
    return "unknown";
  }
}

static void handleRoot()
{
  addCorsHeaders();
  server.send(200, "text/plain", "ESP32 backend is running");
}

static void handleLog()
{
  addCorsHeaders();
  server.send(200, "text/plain", uartVisibleMessage());
}

static void handleLogs()
{
  addCorsHeaders();
  server.send(200, "text/plain", loggerBuild());
}

static void handleIp()
{
  addCorsHeaders();
  server.send(200, "text/plain", WiFi.localIP().toString());
}

static void handleTelemetry()
{
  addCorsHeaders();
  server.send(200, "application/json", uartTelemetryJson());
}

static void handleTelemetryValue(const char *name)
{
  float t = 0.0f;
  float h = 0.0f;
  float p = 0.0f;
  float l = 0.0f;
  float aq = 0.0f;

  if (!uartTelemetryGet(t, h, p, l, aq))
  {
    server.send(404, "text/plain", "No telemetry data yet");
    return;
  }

  float value = 0.0f;
  if (strcmp(name, "t") == 0)
  {
    value = t;
  }
  else if (strcmp(name, "h") == 0)
  {
    value = h;
  }
  else if (strcmp(name, "p") == 0)
  {
    value = p;
  }
  else if (strcmp(name, "l") == 0)
  {
    value = l;
  }
  else if (strcmp(name, "aq") == 0)
  {
    value = aq;
  }

  addCorsHeaders();
  server.send(200, "text/plain", String(value, 2));
}

void webServiceBegin()
{
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);

  Serial.println(F("Starting WiFi connection"));
  loggerAdd(String("Connecting to WiFi: ") + wifiSsid);
  WiFi.begin(wifiSsid, wifiPassword);

  unsigned long startAttempt = millis();
  unsigned long lastStatusPrint = 0;
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 20000)
  {
    if (millis() - lastStatusPrint >= 2000)
    {
      wl_status_t status = WiFi.status();
      Serial.print(F("WiFi status: "));
      Serial.println(wifiStatusText(status));
      loggerAdd(String("WiFi status: ") + wifiStatusText(status));
      lastStatusPrint = millis();
    }

    delay(500);
  }

  if (WiFi.status() != WL_CONNECTED)
  {
    loggerAdd("WiFi connect failed");
    Serial.println(F("WiFi connect failed"));
    Serial.println(F("Check that the network is 2.4 GHz and the SSID/password are correct"));
  }
  else
  {
    loggerAdd(String("Connected, IP: ") + WiFi.localIP().toString());
    Serial.print(F("Connected, IP: "));
    Serial.println(WiFi.localIP());
  }

  server.on("/", handleRoot);
  server.on("/log", handleLog);
  server.on("/logs", handleLogs);
  server.on("/ip", handleIp);
  server.on("/api/telemetry", handleTelemetry);
  server.on("/api/t", []() { handleTelemetryValue("t"); });
  server.on("/api/h", []() { handleTelemetryValue("h"); });
  server.on("/api/p", []() { handleTelemetryValue("p"); });
  server.on("/api/l", []() { handleTelemetryValue("l"); });
  server.on("/api/aq", []() { handleTelemetryValue("aq"); });
  server.onNotFound([](){
    if (server.method() == HTTP_OPTIONS)
    {
      addCorsHeaders();
      server.send(204, "text/plain", "");
    }
    else
    {
      server.send(404, "text/plain", "Not Found");
    }
  });

  server.begin();
  loggerAdd("HTTP server started on port 8000");
}

void webServiceLoop()
{
  server.handleClient();
}