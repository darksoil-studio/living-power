#include <Arduino_MKRENV.h>
#include <Wire.h>
#include <SD.h>
// #include <WiFiNINA.h>
#include <RTCZero.h>
#include <ArduinoLowPower.h>
//#include <ArduinoECCX08.h>
#include <Arduino_PMIC.h>
// #include <SAMD_AnalogCorrection.h>
#include <RunningMedian.h>


// Define chip select pin
const int chipSelect = 4;

// Define data logging interval (in milliseconds)
// 60000 = 1 minute N.B. 1 second needed to log a measurement
// const unsigned long loggingInterval = 1799000; // log every 30 minutes allowing 1 second for recording a measurement
// const unsigned long loggingInterval = 599000; // log every 10 minutes allowing 1 second for recording a measurement
const unsigned long loggingInterval = 3599000; // log every 1 hour allowing 1 second for recording a measurement
// const unsigned long loggingInterval = 59000; // log every 1 minute

// Define file name for data logging
const char* fileName = "data.csv";

// Wi-Fi credentials
const char* ssid = "your_wifi_ssid";
const char* password = "your_wifi_password";

// NTP server details
const char* ntpServer = "pool.ntp.org";
const int timeZone = 0; // Adjust for your time zone
const int NTP_PACKET_SIZE = 48;

// WiFiUDP udp;
RTCZero rtc;
// Declare a variable to store the light level
float lightLevel;

bool woke = false;

const int sampleSize = 31;
RunningMedian samples = RunningMedian(sampleSize);

void setup() {

  Serial.begin(9600);
  while(!Serial);

  // WiFi.end();

 // Connect to Wi-Fi and set RTC
  // connectToWiFi();
  // setTimeFromNTP();

  // Disconnect from Wi-Fi to save power
  // WiFi.disconnect();
  Serial.println("Disconnected from Wi-Fi");

  // deactivate crypto chip to reduce energy consumption
  //ECCX08.begin();
  //ECCX08.end();     // power down ECC508

  // Initialize sensors
  if (!ENV.begin()) {
    Serial.println("Failed to initialize MKR ENV shield!");
    while (1);
  }

  // Initialize RTC
  rtc.begin();
      Serial.println("sss");

  // Initialize SD card
  if (!SD.begin()) {
    Serial.println("Failed to initialize SD card!");
    while (1);
  }

  // Open file for data logging
  File dataFile = SD.open(fileName, FILE_WRITE);
  if (!dataFile) {
    Serial.println("Failed to open file for data logging!");
    while (1);
  }
  dataFile.println("Date,Time,Temperature (C),Humidity (%),Light Level (lux),Voltage");
  dataFile.close();

  // Setting voltage 
  analogReference(AR_DEFAULT); 
  analogReadResolution(12);
  // analogReadCorrection(5,)  Analog correction 
}

void sendMeasurementsIfRequested() {
  if (Serial.available() > 0) {
      char rc = Serial.read();
      if (rc == 'c') {
        File dataFile = SD.open(fileName, FILE_READ);

        while (dataFile.available()) {
          char buf[4096];
          int bytes = dataFile.read(buf, 4096);
          Serial.write(buf, bytes);
          //Serial.write(dataFile.read());
        }
        Serial.println("");
        Serial.println("EndOfFile");
        dataFile.close();
      }
  }
}

void loop() {
  sendMeasurementsIfRequested();
 
  // Read sensor data
  float temperature = ENV.readTemperature();
  float humidity = ENV.readHumidity();
  float lightLevel = ENV.readIlluminance(); 

  // Read voltage
  // float voltage = analogRead(A0) * 3.3 / 4095;

//  for (int i = 0; i < sampleSize; i++) {
//    int a = analogRead(A0);
//    samples.add(a);
//  }
//  float voltage = samples.getMedian() * 3.3 / 4095;
//  samples.clear();
  float voltage = random(200,500);
  //Serial.print("Voltage= ");
  //Serial.println(voltage, 3);

  // Log data to SD card
  //Serial.println("Logging data");
  logData(temperature, humidity, lightLevel, voltage);

  // Enter sleep mode
  //LowPower.deepSleep(loggingInterval); 

  // Enter sleep mode for 1 minute
  //delay(10); // Wait for 1 second to ensure any remaining data logging is completed
  //LowPower.attachInterruptWakeup(13, callback, CHANGE);
  //LowPower.deepSleep(10000); // Enter sleep mode for 59 seconds
}

void callback() {
  woke = true;
}

void logData(float temperature, float humidity, float lightLevel, float voltage) {
  File dataFile = SD.open(fileName, FILE_WRITE);
  if (dataFile) {
    char timestamp[20];
    snprintf(timestamp, sizeof(timestamp), "%04d-%02d-%02d,%02d:%02d:%02d",
             rtc.getYear(), rtc.getMonth(), rtc.getDay(),
             rtc.getHours(), rtc.getMinutes(), rtc.getSeconds());
    dataFile.print(timestamp);
    dataFile.print(",");
    dataFile.print(temperature);
    dataFile.print(",");
    dataFile.print(humidity);
    dataFile.print(",");
    dataFile.print(lightLevel);
    dataFile.print(",");

    // Format voltage with three digits past the decimal point
    String voltageStr = String(voltage, 3); // 3 digits past the decimal point
    dataFile.println(voltageStr);
    dataFile.close();
  } else {
    //Serial.println("Error opening file");
  }
}
// void connectToWiFi() {
//   int status = WL_IDLE_STATUS;
//   while (status != WL_CONNECTED) {
//     Serial.print("Attempting to connect to SSID: ");
//     Serial.println(ssid);
//     status = WiFi.begin(ssid, password);
//     delay(10000); // Wait 10 seconds before retrying
//   }
//   Serial.println("Connected to Wi-Fi");
// }

// void setTimeFromNTP() {
//   udp.begin(2390); // Start UDP
//   sendNTPpacket();
//   delay(1000);

//   if (udp.parsePacket()) {
//     byte packetBuffer[NTP_PACKET_SIZE];
//     udp.read(packetBuffer, NTP_PACKET_SIZE);

//     unsigned long highWord = word(packetBuffer[40], packetBuffer[41]);
//     unsigned long lowWord = word(packetBuffer[42], packetBuffer[43]);
//     unsigned long secsSince1900 = (highWord << 16) | lowWord;
//     const unsigned long seventyYears = 2208988800UL;
//     unsigned long epoch = secsSince1900 - seventyYears;
//     rtc.setEpoch(epoch + timeZone * 3600);
//     Serial.println("RTC time set from NTP");
//   } else {
//     Serial.println("No NTP response");
//   }

//   udp.stop();
// }

// void sendNTPpacket() {
//   byte packetBuffer[NTP_PACKET_SIZE] = { 0 };
//   packetBuffer[0] = 0b11100011; // LI, Version, Mode
//   udp.beginPacket(ntpServer, 123); // NTP requests are to port 123
//   udp.write(packetBuffer, NTP_PACKET_SIZE);
//   udp.endPacket();
// }

