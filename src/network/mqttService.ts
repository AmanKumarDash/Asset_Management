import { appLogger } from "@/utils/appLogger";
import mqtt from "mqtt";

const MQTT_BROKER = "wss://no-counter.smaketsolutions.com:9002";
const MQTT_TOPIC = "SMDEV-001p";
const MQTT_USERNAME = "smaket";
const MQTT_PASSWORD = "smaket123";

export type MqttConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "error";

type MessageListener = (payload: unknown) => void;
type StatusListener = (status: MqttConnectionStatus) => void;

class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private status: MqttConnectionStatus = "idle";

  private emitMessage(payload: unknown) {
    appLogger.info("MQTT", "Broadcasting MQTT message to listeners.", {
      listenerCount: this.messageListeners.size,
      payloadType: Array.isArray(payload) ? "array" : typeof payload,
    });
    this.messageListeners.forEach((listener) => listener(payload));
  }

  private emitStatus(status: MqttConnectionStatus) {
    this.status = status;
    appLogger.info("MQTT", "Connection status changed.", {
      status,
      topic: MQTT_TOPIC,
      broker: MQTT_BROKER,
      listenerCount: this.statusListeners.size,
    });
    this.statusListeners.forEach((listener) => listener(status));
  }

  public onMessage(listener: MessageListener) {
    this.messageListeners.add(listener);
    appLogger.info("MQTT", "Registered message listener.", {
      listenerCount: this.messageListeners.size,
    });
  }

  public offMessage(listener: MessageListener) {
    this.messageListeners.delete(listener);
    appLogger.info("MQTT", "Removed message listener.", {
      listenerCount: this.messageListeners.size,
    });
  }

  public onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    appLogger.info("MQTT", "Registered status listener.", {
      listenerCount: this.statusListeners.size,
      currentStatus: this.status,
    });
    listener(this.status);
  }

  public offStatus(listener: StatusListener) {
    this.statusListeners.delete(listener);
    appLogger.info("MQTT", "Removed status listener.", {
      listenerCount: this.statusListeners.size,
    });
  }

  public connectMqtt(): void {
    if (this.client) {
      appLogger.info("MQTT", "Skipped connect because client already exists.", {
        status: this.status,
      });
      return;
    }

    appLogger.info("MQTT", "Opening MQTT connection.", {
      broker: MQTT_BROKER,
      topic: MQTT_TOPIC,
      username: MQTT_USERNAME,
    });
    this.emitStatus("connecting");

    this.client = mqtt.connect(MQTT_BROKER, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      reconnectPeriod: 5000,
      clean: true,
    });

    this.client.on("connect", () => {
      appLogger.info("MQTT", "Connected to MQTT broker.", {
        broker: MQTT_BROKER,
        topic: MQTT_TOPIC,
      });
      this.emitStatus("connected");

      this.client?.subscribe(MQTT_TOPIC, (error) => {
        if (error) {
          appLogger.error("MQTT", "Failed to subscribe to MQTT topic.", {
            topic: MQTT_TOPIC,
            error,
          });
          this.emitStatus("error");
          return;
        }

        appLogger.info("MQTT", "Subscribed to MQTT topic.", {
          topic: MQTT_TOPIC,
        });
      });
    });

    this.client.on("message", (topic, message) => {
      const messageText = message.toString();
      appLogger.info("MQTT", "Received MQTT message.", {
        topic,
        size: messageText.length,
        preview: messageText.slice(0, 120),
      });

      try {
        this.emitMessage(JSON.parse(messageText));
      } catch {
        this.emitMessage(messageText);
      }
    });

    this.client.on("reconnect", () => {
      appLogger.warn("MQTT", "Reconnecting to MQTT broker.", {
        broker: MQTT_BROKER,
        topic: MQTT_TOPIC,
      });
      this.emitStatus("reconnecting");
    });

    this.client.on("close", () => {
      appLogger.warn("MQTT", "MQTT connection closed.", {
        broker: MQTT_BROKER,
        topic: MQTT_TOPIC,
      });
      this.client = null;
      this.emitStatus("closed");
    });

    this.client.on("error", (error) => {
      appLogger.error("MQTT", "MQTT client error.", {
        broker: MQTT_BROKER,
        topic: MQTT_TOPIC,
        error,
      });
      this.emitStatus("error");
    });
  }

  public disconnectMqtt(): void {
    if (this.client) {
      appLogger.info("MQTT", "Closing MQTT connection by request.", {
        broker: MQTT_BROKER,
        topic: MQTT_TOPIC,
      });
      this.client.end(true);
      this.client = null;
    } else {
      appLogger.info("MQTT", "Disconnect requested with no active client.", {
        status: this.status,
      });
    }

    this.emitStatus("idle");
  }
}

export default new MQTTService();
