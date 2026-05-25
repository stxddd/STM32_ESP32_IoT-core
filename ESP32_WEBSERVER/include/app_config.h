#pragma once

#include <Arduino.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define UART_BAUD 115200
#define UART_RX 3
#define UART_TX 1
#define RX_BUFFER_SIZE 128
#define LOG_LINES 12
#define LOG_LINE_LEN 96

extern char wifiSsid[64];
extern char wifiPassword[64];

void applySecrets();
