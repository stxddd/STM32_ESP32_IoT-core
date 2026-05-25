#include "logger.h"

#include <Arduino.h>

#include "app_config.h"

static char logBuffer[LOG_LINES][LOG_LINE_LEN + 1];
static uint8_t logCount = 0;
static uint8_t logHead = 0;

void loggerReset()
{
  logCount = 0;
  logHead = 0;
  for (uint8_t i = 0; i < LOG_LINES; ++i)
  {
    logBuffer[i][0] = '\0';
  }
}

void loggerAdd(const String &message)
{
  char entry[LOG_LINE_LEN + 1];
  unsigned long seconds = millis() / 1000;
  snprintf(entry, sizeof(entry), "[%lus] %s", seconds, message.c_str());

  strncpy(logBuffer[logHead], entry, LOG_LINE_LEN);
  logBuffer[logHead][LOG_LINE_LEN] = '\0';
  logHead = (logHead + 1) % LOG_LINES;
  if (logCount < LOG_LINES)
  {
    ++logCount;
  }

  Serial.println(entry);
}

String loggerBuild()
{
  String logs;
  uint8_t start = (logCount < LOG_LINES) ? 0 : logHead;

  for (uint8_t i = 0; i < logCount; ++i)
  {
    uint8_t index = (start + i) % LOG_LINES;
    logs += logBuffer[index];
    logs += '\n';
  }

  if (logs.length() == 0)
  {
    logs = F("No logs yet\n");
  }

  return logs;
}