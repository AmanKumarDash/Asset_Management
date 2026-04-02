import { apiService } from "@/network/ApiService";
import mqttService, { MqttConnectionStatus } from "@/network/mqttService";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuditScanItem } from "../data/auditScanData";
import { InventoryBarcodeScanDetail } from "../types/inventory";

function getTagId(entry: unknown): string | null {
  if (typeof entry === "string") {
    const value = entry.trim();
    return value || null;
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const directTagId = record.TAG_ID;

  if (typeof directTagId === "string" && directTagId.trim()) {
    return directTagId.trim();
  }

  const nestedData = record.DATA;

  if (!nestedData || typeof nestedData !== "object") {
    return null;
  }

  const nestedTagId = (nestedData as Record<string, unknown>).TAG_ID;
  return typeof nestedTagId === "string" && nestedTagId.trim()
    ? nestedTagId.trim()
    : null;
}

function mapInventoryToAuditItem(
  tagId: string,
  asset: InventoryBarcodeScanDetail | null
): AuditScanItem {
  if (!asset) {
    return {
      id: tagId,
      title: "RFID Asset Detected",
      subtitle: `${tagId} - Details unavailable`,
      tone: "found",
      icon: "plus-square",
    };
  }

  const productCode = asset.ProductCode?.trim();
  const manufacturer = asset.ManufecturName?.trim();
  const modelNo = asset.ModelNo?.trim();
  const subtitleParts = [
    asset.TagId?.trim() || tagId,
    productCode,
    manufacturer,
    modelNo,
  ].filter(Boolean);

  return {
    id: asset.TagId?.trim() || tagId,
    title: asset.ProductName?.trim() || "RFID Asset Detected",
    subtitle: subtitleParts.join(" - "),
    tone: "found",
    icon: "plus-square",
  };
}

export function useAuditScanState() {
  const [manualAssetId, setManualAssetId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [mqttItems, setMqttItems] = useState<AuditScanItem[]>([]);
  const [manualItems, setManualItems] = useState<AuditScanItem[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<MqttConnectionStatus>("idle");
  const itemCacheRef = useRef(new Map<string, AuditScanItem>());
  const pendingLookupsRef = useRef(new Map<string, Promise<AuditScanItem>>());

  const resolveAuditItem = useCallback(async (tagId: string) => {
    const cachedItem = itemCacheRef.current.get(tagId);

    if (cachedItem) {
      return cachedItem;
    }

    const pendingLookup = pendingLookupsRef.current.get(tagId);

    if (pendingLookup) {
      return pendingLookup;
    }

    const lookupPromise = apiService
      .searchInventoryBarcodeScanMode(tagId)
      .then((results) => mapInventoryToAuditItem(tagId, results[0] ?? null))
      .catch(() => mapInventoryToAuditItem(tagId, null))
      .then((item) => {
        itemCacheRef.current.set(tagId, item);
        pendingLookupsRef.current.delete(tagId);
        return item;
      });

    pendingLookupsRef.current.set(tagId, lookupPromise);
    return lookupPromise;
  }, []);

  const handleMqttMessage = useCallback(
    (payload: unknown) => {
      const tagIds = Array.isArray(payload)
        ? Array.from(
            new Set(payload.map((entry) => getTagId(entry)).filter(Boolean))
          )
        : [getTagId(payload)].filter(Boolean);

      if (tagIds.length === 0) {
        return;
      }

      void Promise.all(
        tagIds.map((tagId) => resolveAuditItem(tagId as string))
      ).then((resolvedItems) => {
        if (Array.isArray(payload)) {
          setMqttItems(resolvedItems);
          return;
        }

        setMqttItems((current) => {
          const nextItems = [...current];

          resolvedItems.forEach((item) => {
            if (!nextItems.some((existingItem) => existingItem.id === item.id)) {
              nextItems.unshift(item);
            }
          });

          return nextItems;
        });
      });
    },
    [resolveAuditItem]
  );

  useEffect(() => {
    if (!isScanning) {
      return;
    }

    mqttService.onMessage(handleMqttMessage);
    mqttService.onStatus(setConnectionStatus);
    mqttService.connectMqtt();

    return () => {
      mqttService.offMessage(handleMqttMessage);
      mqttService.offStatus(setConnectionStatus);
      mqttService.disconnectMqtt();
      setConnectionStatus("idle");
    };
  }, [handleMqttMessage, isScanning]);

  const items = useMemo(
    () => [...manualItems, ...mqttItems],
    [manualItems, mqttItems]
  );

  const summary = useMemo(() => {
    if (!isScanning) {
      return { found: 0, missing: 0, extra: 0, scanned: 0 };
    }

    const found = items.filter((item) => item.tone === "found").length;
    const missing = items.filter((item) => item.tone === "missing").length;
    const extra = items.filter((item) => item.tone === "extra").length;
    const scanned = items.length;

    return { found, missing, extra, scanned };
  }, [isScanning, items]);

  const startAudit = useCallback(() => {
    setIsScanning(true);
    itemCacheRef.current.clear();
    pendingLookupsRef.current.clear();
    setMqttItems([]);
    setManualItems([]);
  }, []);

  const addManualAsset = useCallback(() => {
    const value = manualAssetId.trim();

    if (!value || !isScanning) {
      return;
    }

    setManualItems((current) => {
      if (current.some((item) => item.id === value)) {
        return current;
      }

      return [
        {
          id: value,
          title: "Manual Asset Entry",
          subtitle: `${value} - Added manually`,
          tone: "extra",
          icon: "plus-circle",
        },
        ...current,
      ];
    });

    setManualAssetId("");
  }, [isScanning, manualAssetId]);

  return {
    items,
    isScanning,
    connectionStatus,
    manualAssetId,
    setManualAssetId,
    startAudit,
    addManualAsset,
    summary,
  };
}
