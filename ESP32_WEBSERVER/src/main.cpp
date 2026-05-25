#include <Arduino.h>
#include <WiFi.h>

#include "app_config.h"
#include "logger.h"
#include "uart_service.h"
#include "web_service.h"

void setup()
{
  Serial.begin(UART_BAUD);
  delay(1000);
  Serial.println();
  Serial.println(F("Booting ESP32 UART web logger"));

  loggerReset();
  applySecrets();
  uartServiceBegin();

  webServiceBegin();

  loggerAdd("UART web logger ready");
  loggerAdd(String("WiFi SSID: ") + wifiSsid);
  loggerAdd(String("Local IP: ") + WiFi.localIP().toString());
  loggerAdd("HTTP port: 8000");
}

void loop()
{
  webServiceLoop();
  uartServicePoll();
}
