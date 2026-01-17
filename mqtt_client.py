import json
import threading
from paho.mqtt import client as mqtt_client

BROKER = "mqtt"
PORT = 1883
TOPIC = "factory/plantA/device/+/telemetry"

latest_message = None

def on_connect(client, userdata, flags, rc):
    print("MQTT connected:", rc)
    client.subscribe(TOPIC)

def on_message(client, userdata, msg):
    global latest_message
    try:
        payload = json.loads(msg.payload.decode())
        latest_message = payload
    except Exception as e:
        print("MQTT parse error:", e)

def start_mqtt():
    client = mqtt_client.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER, PORT)
    client.loop_forever()

def run():
    thread = threading.Thread(target=start_mqtt, daemon=True)
    thread.start()
