#pragma once

#include <Arduino.h>

void uartServiceBegin();
void uartServicePoll();
String uartVisibleMessage();
bool uartTelemetryGet(float &temperature, float &humidity, float &pressure, float &light, float &airQuality);
String uartTelemetryJson();