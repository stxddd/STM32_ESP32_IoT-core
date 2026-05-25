#include "app_config.h"
#include "Secrets.h"

char wifiSsid[64] = "";
char wifiPassword[64] = "";

void applySecrets()
{
	if (SECRET_WIFI_SSID[0] != '\0')
	{
		strncpy(wifiSsid, SECRET_WIFI_SSID, sizeof(wifiSsid) - 1);
		wifiSsid[sizeof(wifiSsid) - 1] = '\0';
	}

	if (SECRET_WIFI_PASS[0] != '\0')
	{
		strncpy(wifiPassword, SECRET_WIFI_PASS, sizeof(wifiPassword) - 1);
		wifiPassword[sizeof(wifiPassword) - 1] = '\0';
	}
}