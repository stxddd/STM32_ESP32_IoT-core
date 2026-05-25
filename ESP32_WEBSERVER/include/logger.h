#pragma once

#include <Arduino.h>

void loggerReset();
void loggerAdd(const String &message);
String loggerBuild();