#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "Placeholder WiFi Name";
const char* password = "Placeholder WiFi Password";
const char* serverName = "https://jsonplaceholder.typicode.com/todos/1";

void setup()
{
  Serial.begin(115200);

  Serial.println("Connecting to WiFi");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
}

void loop()
{
  if (WiFi.status() == WL_CONNECTED)
  {
    HTTPClient http;

    http.begin(serverName);
    int httpResponseCode = http.GET();

    if (httpResponseCode > 0)
    {
      String payload = http.getString();
      Serial.println("HTTP Response: " + String(httpResponseCode));
      Serial.println("Payload: " + payload);
    }
    else
    {
      Serial.println("HTTP Error: " + String(httpResponseCode));
    }

    http.end();
  }
  else
  {
    Serial.println("WiFi Disconnected");
  }

  delay(10000);
}