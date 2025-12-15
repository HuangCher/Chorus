#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>

Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);
#define I2C_SDA 4
#define I2C_SCL 5

void setup() 
{
  Serial.begin(115200);
  Wire.begin(I2C_SDA, I2C_SCL);

  if(!accel.begin())
  {
    Serial.println("No Accelerometer detected");
    while(1);
  }

  accel.setRange(ADXL345_RANGE_16_G);
  Serial.println("Accelerometer initialized");
}

void loop() 
{
  sensors_event_t event; 
  accel.getEvent(&event);
  
  Serial.print("X: "); Serial.print(event.acceleration.x); Serial.print(" m/s^2 ");
  Serial.print("Y: "); Serial.print(event.acceleration.y); Serial.print(" m/s^2 ");
  Serial.print("Z: "); Serial.print(event.acceleration.z); Serial.println(" m/s^2 ");
  
  delay(1000);
}