### ESP32 Webserver

## Описание
- Простой веб‑сервер на ESP32 для управления и мониторинга устройства через HTTP.

## Быстрый старт
- Впишите свои данные Wi‑Fi в `include/Secrets.h`:

```c++
const char SECRET_WIFI_SSID[] = "";
const char SECRET_WIFI_PASS[] = "";
```

- Соберите и залейте прошивку

## Структура проекта
- `src/main.cpp` — точка входа.
- `src/web_service.cpp` — HTTP backend и API.
- `src/uart_service.cpp` — UART-взаимодействие.
- `src/logger.cpp` — логирование.
- `include/*.h` — конфигурация и секреты.
- `platformio.ini` — настройки сборки.

## Endpoints
- `GET /` — health/status ответ бэкенда (порт по умолчанию `8000`).
- `GET /log` — последнее видимое UART‑сообщение (plain text).
- `GET /logs` — содержимое логов (plain text).
- `GET /ip` — IP‑адрес устройства (plain text).
- `GET /api/telemetry` — все телеметрические данные в формате JSON.
- `GET /api/t` — значение температуры (plain text).
- `GET /api/h` — значение влажности (plain text).
- `GET /api/p` — значение давления (plain text).
- `GET /api/l` — значение освещённости (plain text).
- `GET /api/aq` — показатель качества воздуха (plain text).




