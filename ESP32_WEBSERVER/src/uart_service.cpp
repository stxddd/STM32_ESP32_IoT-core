#include "uart_service.h"

#include <Arduino.h>
#include <cstdlib>

#include "app_config.h"
#include "logger.h"

static HardwareSerial uartSerial(2);
static char rxBuffer[RX_BUFFER_SIZE + 1];
static char lastMessage[RX_BUFFER_SIZE + 1];
static uint16_t rxLen = 0;
static float telemetryT = 0.0f;
static float telemetryH = 0.0f;
static float telemetryP = 0.0f;
static float telemetryL = 0.0f;
static float telemetryAQ = 0.0f;
static bool telemetryValid = false;

static const char *findJsonValue(const char *json, const char *key)
{
  char pattern[16];
  snprintf(pattern, sizeof(pattern), "\"%s\"", key);
  const char *pos = strstr(json, pattern);
  if (!pos)
  {
    return nullptr;
  }

  pos = strchr(pos, ':');
  if (!pos)
  {
    return nullptr;
  }

  ++pos;
  while (*pos == ' ' || *pos == '\t')
  {
    ++pos;
  }

  return pos;
}

static bool parseTelemetryLine(const char *json)
{
  const char *tPos = findJsonValue(json, "t");
  const char *hPos = findJsonValue(json, "h");
  const char *pPos = findJsonValue(json, "p");
  const char *lPos = findJsonValue(json, "l");
  const char *aqPos = findJsonValue(json, "aq");

  if (!tPos || !hPos || !pPos || !lPos || !aqPos)
  {
    return false;
  }

  char *end = nullptr;
  float t = strtof(tPos, &end);
  if (end == tPos)
  {
    return false;
  }

  float h = strtof(hPos, &end);
  if (end == hPos)
  {
    return false;
  }

  float p = strtof(pPos, &end);
  if (end == pPos)
  {
    return false;
  }

  float l = strtof(lPos, &end);
  if (end == lPos)
  {
    return false;
  }

  float aq = strtof(aqPos, &end);
  if (end == aqPos)
  {
    return false;
  }

  telemetryT = t;
  telemetryH = h;
  telemetryP = p;
  telemetryL = l;
  telemetryAQ = aq;
  telemetryValid = true;
  return true;
}

static void clearBuffer()
{
  rxLen = 0;
  rxBuffer[0] = '\0';
}

static void storeLastMessage()
{
  if (rxLen == 0)
  {
    return;
  }

  rxBuffer[rxLen] = '\0';
  strncpy(lastMessage, rxBuffer, RX_BUFFER_SIZE);
  lastMessage[RX_BUFFER_SIZE] = '\0';
  loggerAdd(String("UART: ") + lastMessage);
  parseTelemetryLine(lastMessage);
  clearBuffer();
}

static void appendReceived(char c)
{
  if (c == '\r')
  {
    return;
  }

  if (c == '\n')
  {
    storeLastMessage();
    return;
  }

  if (rxLen >= RX_BUFFER_SIZE)
  {
    storeLastMessage();
  }

  rxBuffer[rxLen++] = c;
  rxBuffer[rxLen] = '\0';
}

void uartServiceBegin()
{
  uartSerial.begin(UART_BAUD, SERIAL_8N1, UART_RX, UART_TX);
  clearBuffer();
  lastMessage[0] = '\0';
}

void uartServicePoll()
{
  while (uartSerial.available() > 0)
  {
    char c = static_cast<char>(uartSerial.read());
    appendReceived(c);
  }

  static unsigned long lastRefresh = 0;
  if (millis() - lastRefresh >= 1000)
  {
    if (rxLen > 0)
    {
      storeLastMessage();
    }

    lastRefresh = millis();
  }
}

String uartVisibleMessage()
{
  if (rxLen > 0)
  {
    return String(rxBuffer);
  }

  if (lastMessage[0] != '\0')
  {
    return String(lastMessage);
  }

  return String("No UART data yet");
}

bool uartTelemetryGet(float &temperature, float &humidity, float &pressure, float &light, float &airQuality)
{
  if (!telemetryValid)
  {
    return false;
  }

  temperature = telemetryT;
  humidity = telemetryH;
  pressure = telemetryP;
  light = telemetryL;
  airQuality = telemetryAQ;
  return true;
}

String uartTelemetryJson()
{
  if (!telemetryValid)
  {
    return F("{\"ok\":false}");
  }

  char json[160];
  snprintf(json, sizeof(json), "{\"ok\":true,\"t\":%.2f,\"h\":%.2f,\"p\":%.2f,\"l\":%.2f,\"aq\":%.2f}", telemetryT, telemetryH, telemetryP, telemetryL, telemetryAQ);
  return String(json);
}