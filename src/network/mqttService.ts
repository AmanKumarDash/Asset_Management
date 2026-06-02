import { appLogger } from "@/utils/appLogger";
import mqtt from "mqtt";

// These are the MQTT connection details used to receive scanned tag data.
const MQTT_BROKER =
  process.env.EXPO_PUBLIC_MQTT_BROKER ?? "wss://no-counter.smaketsolutions.com:9002";
const MQTT_TOPICS = (
  process.env.EXPO_PUBLIC_MQTT_TOPICS ?? "SMDEV-001p"
)
  .split(",")
  .map((topic) => topic.trim())
  .filter(Boolean);
const MQTT_USERNAME = process.env.EXPO_PUBLIC_MQTT_USERNAME ?? "smaket";
const MQTT_PASSWORD = process.env.EXPO_PUBLIC_MQTT_PASSWORD ?? "smaket123";

export type MqttConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "error";

type MessageListener = (payload: unknown) => void;
type StatusListener = (status: MqttConnectionStatus) => void;

// This service handles the full MQTT connection in one place.
// Other files use this instead of talking to the MQTT client directly.
class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private status: MqttConnectionStatus = "idle";

  // Send the latest scanned message to every file that is listening.
  private emitMessage(payload: unknown) {
    appLogger.info("MQTT", "Broadcasting MQTT message to listeners.", {
      listenerCount: this.messageListeners.size,
      payloadType: Array.isArray(payload) ? "array" : typeof payload,
    });
    this.messageListeners.forEach((listener) => listener(payload));
  }

  // Update the current connection status and tell all listeners about it.
  private emitStatus(status: MqttConnectionStatus) {
    this.status = status;
    appLogger.info("MQTT", "Connection status changed.", {
      status,
      topics: MQTT_TOPICS,
      broker: MQTT_BROKER,
      listenerCount: this.statusListeners.size,
    });
    this.statusListeners.forEach((listener) => listener(status));
  }

  // Add a listener that should receive incoming scan messages.
  public onMessage(listener: MessageListener) {
    this.messageListeners.add(listener);
    appLogger.info("MQTT", "Registered message listener.", {
      listenerCount: this.messageListeners.size,
    });
  }

  // Remove a scan message listener when it is no longer needed.
  public offMessage(listener: MessageListener) {
    this.messageListeners.delete(listener);
    appLogger.info("MQTT", "Removed message listener.", {
      listenerCount: this.messageListeners.size,
    });
  }

  // Add a listener that should receive connection status updates.
  public onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    appLogger.info("MQTT", "Registered status listener.", {
      listenerCount: this.statusListeners.size,
      currentStatus: this.status,
    });
    listener(this.status);
  }

  // Remove a connection status listener when it is no longer needed.
  public offStatus(listener: StatusListener) {
    this.statusListeners.delete(listener);
    appLogger.info("MQTT", "Removed status listener.", {
      listenerCount: this.statusListeners.size,
    });
  }

  // Open the MQTT connection if it is not already open.
  public connectMqtt(): void {
    if (this.client) {
      appLogger.info("MQTT", "Skipped connect because client already exists.", {
        status: this.status,
      });
      return;
    }

    appLogger.info("MQTT", "Opening MQTT connection.", {
      broker: MQTT_BROKER,
      topics: MQTT_TOPICS,
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
        topics: MQTT_TOPICS,
      });
      this.emitStatus("connected");

      // Once connected, start listening to every configured scanner topic.
      this.client?.subscribe(MQTT_TOPICS, (error) => {
        if (error) {
          appLogger.error("MQTT", "Failed to subscribe to MQTT topics.", {
            topics: MQTT_TOPICS,
            error,
          });
          this.emitStatus("error");
          return;
        }

        appLogger.info("MQTT", "Subscribed to MQTT topics.", {
          topics: MQTT_TOPICS,
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
        // If the message is JSON, convert it to an object before sharing it.
        this.emitMessage(JSON.parse(messageText));
      } catch {
        // If it is plain text, share it as it is.
        this.emitMessage(messageText);
      }
    });

    // If the connection drops, MQTT will try to connect again.
    this.client.on("reconnect", () => {
      appLogger.warn("MQTT", "Reconnecting to MQTT broker.", {
        broker: MQTT_BROKER,
        topics: MQTT_TOPICS,
      });
      this.emitStatus("reconnecting");
    });

    // When the connection closes, clear the client and update the status.
    this.client.on("close", () => {
      appLogger.warn("MQTT", "MQTT connection closed.", {
        broker: MQTT_BROKER,
        topics: MQTT_TOPICS,
      });
      this.client = null;
      this.emitStatus("closed");
    });

    // If MQTT reports an error, log it and tell listeners.
    this.client.on("error", (error) => {
      appLogger.error("MQTT", "MQTT client error.", {
        broker: MQTT_BROKER,
        topics: MQTT_TOPICS,
        error,
      });
      this.emitStatus("error");
    });
  }

  // Close the MQTT connection and move the service back to idle state.
  public disconnectMqtt(): void {
    if (this.client) {
      appLogger.info("MQTT", "Closing MQTT connection by request.", {
        broker: MQTT_BROKER,
        topics: MQTT_TOPICS,
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
