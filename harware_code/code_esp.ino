#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "DHTesp.h"
#include "ThingSpeak.h"

#include "DHT.h"
#include <MQ135.h>

// Provide the token generation process info.
#include "addons/TokenHelper.h"
// Provide the RTDB payload printing info and other helper functions.
#include "addons/RTDBHelper.h"

// Insert your network credentials
#define WIFI_SSID "tu mua ma dung"
#define WIFI_PASSWORD "noikhongvoi3d"

// Insert Firebase project API Key
#define API_KEY "AIzaSyDV2jEgdNtpL3gbye18UomihVY2MlRlZrI"

// Insert RTDB URL
#define DATABASE_URL "https://esp32-dc329-default-rtdb.firebaseio.com/" 

const int myChannelNumber = 2691502; // ThingSpeak channel number
const char* myApiKey = "5YKIHR8S7DNKWNIR"; // ThingSpeak API key
const char* server = "api.thingspeak.com"; // ThingSpeak server address

#define DHTPIN 15      //DHT22
#define DHTTYPE DHT22 

#define PIN_MQ135 34  // MQ135

#define DO_PIN 13 // ánh sáng

#define LED_PIN1 2 // A/C
#define LED_PIN2 4 // lamps
#define LED_PIN3 5 // music
#define LED_PIN4 16  // TV
#define LED_PIN4 16  // TV


// Define Firebase Data object
FirebaseData fbdo;

FirebaseAuth auth;
FirebaseConfig config;

WiFiClient client; 

unsigned long sendDataPrevMillis = 0;
bool signupOK = false;

DHT dht(DHTPIN, DHTTYPE);
MQ135 mq135_sensor(PIN_MQ135);

void setup(){
Serial.begin(9600);
WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
Serial.print("Connecting to Wi-Fi");
while (WiFi.status() != WL_CONNECTED){
Serial.print(".");
delay(300);
}
Serial.println();
Serial.print("Connected with IP: ");
Serial.println(WiFi.localIP());
Serial.println();

dht.begin();

/* Assign the api key (required) */
config.api_key = API_KEY;

/* Assign the RTDB URL (required) */
config.database_url = DATABASE_URL;

/* Sign up */
if (Firebase.signUp(&config, &auth, "", "")){
Serial.println("ok");
signupOK = true;
}
else{
Serial.printf("%s\n", config.signer.signupError.message.c_str());
}

/* Assign the callback function for the long running token generation task */
config.token_status_callback = tokenStatusCallback; //see addons/TokenHelper.h

Firebase.begin(&config, &auth);
Firebase.reconnectWiFi(true);

ThingSpeak.begin(client); // Initialize the ThingSpeak library

pinMode(DO_PIN, INPUT);
pinMode(LED_PIN1, OUTPUT);
pinMode(LED_PIN2, OUTPUT);
pinMode(LED_PIN3, OUTPUT);
pinMode(LED_PIN4, OUTPUT);
}

    

float correctedPPMToAQI(float correctedPPM) {
    float aqi = 0.0;

    // Ví dụ cho CO2
    if (correctedPPM <= 400) {
        aqi = (correctedPPM / 400.0) * 50; // 0-400 PPM tương ứng với AQI 0-50
    } else if (correctedPPM <= 1000) {
        aqi = ((correctedPPM - 400) / (1000 - 400)) * (100 - 50) + 50; // 400-1000 PPM tương ứng với AQI 50-100
    } else if (correctedPPM <= 2000) {
        aqi = ((correctedPPM - 1000) / (2000 - 1000)) * (150 - 100) + 100; // 1000-2000 PPM tương ứng với AQI 100-150
    } else {
        aqi = 150; // AQI 150 trở lên
    }

    return aqi;
}


void loop(){
  float h = dht.readHumidity();  // Read humidity
  float t = dht.readTemperature(); // Read temperature

  Serial.print(F("Humidity: "));
  Serial.print(h);
  Serial.print(F("%  Temperature: "));
  Serial.print(t);
  Serial.print(F("°C ")); 

  float correctedPPM = mq135_sensor.getCorrectedPPM(t, h);
  float aqi = correctedPPMToAQI(correctedPPM);


    // Set the value of field 1 in the ThingSpeak channel to the temperature
  ThingSpeak.setField(1,t);
  // Set the value of field 2 in the ThingSpeak channel to the humidity 
  ThingSpeak.setField(2,h); 

  // Write the data to the ThingSpeak channel
  int status = ThingSpeak.writeFields(myChannelNumber,myApiKey); 
  if(status == 200){
    Serial.println("Data pushed successfully"); // Print a message if the data was successfully pushed to ThingSpeak
  }else{
    Serial.println("Push error" + String(status)); // Print an error message with the HTTP status code if there was an error pushing the data
  }
  Serial.println("---"); // Print a separator line

  int lightState = digitalRead(DO_PIN);
  int light = 0;
  if (lightState == HIGH)
    light = 0;
  else 
    light = 1;


  if (Firebase.ready() && signupOK && (millis() - sendDataPrevMillis > 1000 || sendDataPrevMillis == 0)){
    sendDataPrevMillis = millis();

    if (Firebase.RTDB.setFloat(&fbdo, "Phongkhach/anhsang", light)){
      Serial.println("Lightstate data sent successfully");
    } else {
      Serial.println("Failed to send lightstate data");
    }

    if (Firebase.RTDB.setFloat(&fbdo, "Phongkhach/Do am", h)){
      Serial.println("Humidity data sent successfully");
    } else {
      Serial.println("Failed to send humidity data");
    }

    if (Firebase.RTDB.setFloat(&fbdo, "Phongkhach/Nhiet do", t)){
      Serial.println("Temperature data sent successfully");
    } else {
      Serial.println("Failed to send temperature data");
    }

    if (Firebase.RTDB.setFloat(&fbdo, "Phongkhach/Khongkhi", aqi)){
      Serial.println("Air data sent successfully");
    } else {
      Serial.println("Failed to send Air data");
    }
  }


  if (lightState == HIGH){
    Serial.println("Troi toi");
  }
  else 
    Serial.println("Troi sang");

// Lấy giá trị từ Firebase
if (Firebase.ready() && signupOK) {
    float ledState;

    // Lấy trạng thái A/C từ Firebase
    if (Firebase.RTDB.getFloat(&fbdo, "Phongkhach/ac")) {
        ledState = fbdo.floatData(); // Sửa ở đây
        Serial.print("A/C state from Firebase: ");
        Serial.println(ledState);
        digitalWrite(LED_PIN1, ledState == 1 ? HIGH : LOW);
    } 

    // Lấy trạng thái đèn từ Firebase
    if (Firebase.RTDB.getInt(&fbdo, "Phongkhach/lamps")) {
        ledState = fbdo.intData(); // Sửa ở đây
        Serial.print("Lamps state from Firebase: ");
        Serial.println(ledState);
        digitalWrite(LED_PIN2,ledState == 1 ? HIGH : LOW);
    } 

    // Lấy trạng thái nhạc từ Firebase
    if (Firebase.RTDB.getFloat(&fbdo, "Phongkhach/music")) {
        ledState = fbdo.floatData(); // Sửa ở đây
        Serial.print("Music state from Firebase: ");
        Serial.println(ledState);
        digitalWrite(LED_PIN3, ledState == 1 ? HIGH : LOW);
    }

    // Lấy trạng thái TV từ Firebase
    if (Firebase.RTDB.getFloat(&fbdo, "Phongkhach/tv")) {
        ledState = fbdo.floatData(); // Sửa ở đây
        Serial.print("TV state from Firebase: ");
        Serial.println(ledState);
        digitalWrite(LED_PIN4, ledState == 1 ? HIGH : LOW);
    }  
}

   Serial.println("###############################################"); // Print a separator line



  delay(100);
}