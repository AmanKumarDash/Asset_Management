import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import {
  employeeMismatchPreview,
  employeeScanOverview,
  employeeSubmitSummary,
} from "../data/employeeAuditData";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { adminTheme } from "@/theme/adminTheme";

function SummaryStrip() {
  const cards = [
    { label: "Found", value: employeeSubmitSummary.found, color: "#3B6D11" },
    { label: "Missing", value: employeeSubmitSummary.missing, color: "#C0392B" },
    { label: "Extra", value: employeeSubmitSummary.extra, color: "#B7791F" },
    { label: "Expected", value: employeeSubmitSummary.expected, color: adminTheme.primary },
  ] as const;

  return (
    <View className="flex-row flex-wrap gap-3">
      {cards.map((card) => (
        <View
          key={card.label}
          className="min-w-[140px] flex-1 rounded-[18px] border px-4 py-4"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
        >
          <Text className="text-[28px] font-semibold" style={{ color: card.color }}>
            {card.value}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            {card.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SubmissionFormCard() {
  const { user } = useAuthSession();

  if (!user) {
    return null;
  }

  const fieldClass = "rounded-[14px] border px-4 py-3.5";
  const fieldStyle = {
    borderColor: adminTheme.border,
    backgroundColor: adminTheme.surface,
  } as const;

  return (
    <View
      className="rounded-[20px] border bg-white p-5"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <Text className="mb-5 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
        Submission details
      </Text>

      <View className="mb-4 flex-row flex-wrap gap-4">
        <View className="min-w-[220px] flex-1">
          <Text className="mb-2 text-sm" style={{ color: adminTheme.muted }}>
            Your name
          </Text>
          <View className={fieldClass} style={fieldStyle}>
            <Text style={{ color: adminTheme.slate }}>{user.name}</Text>
          </View>
        </View>
        <View className="min-w-[220px] flex-1">
          <Text className="mb-2 text-sm" style={{ color: adminTheme.muted }}>
            Location / Place
          </Text>
          <View className={fieldClass} style={fieldStyle}>
            <Text style={{ color: adminTheme.slate }}>{employeeSubmitSummary.location}</Text>
          </View>
        </View>
      </View>

      <View className="mb-4 flex-row flex-wrap gap-4">
        <View className="min-w-[220px] flex-1">
          <Text className="mb-2 text-sm" style={{ color: adminTheme.muted }}>
            Date & time
          </Text>
          <View className={fieldClass} style={fieldStyle}>
            <Text style={{ color: adminTheme.muted }}>{employeeSubmitSummary.observedAt} (auto-filled)</Text>
          </View>
        </View>
        <View className="min-w-[220px] flex-1">
          <Text className="mb-2 text-sm" style={{ color: adminTheme.muted }}>
            Audit reference
          </Text>
          <View className={fieldClass} style={fieldStyle}>
            <Text style={{ color: adminTheme.muted }}>{employeeSubmitSummary.reference} (auto-generated)</Text>
          </View>
        </View>
      </View>

      <Text className="mb-2 text-sm" style={{ color: adminTheme.muted }}>
        Comment / Observation
      </Text>
      <View
        className="rounded-[14px] border px-4 py-4"
        style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
      >
        <Text style={{ color: adminTheme.slate }}>{employeeSubmitSummary.observation}</Text>
      </View>
    </View>
  );
}

function DesktopEmployeeSubmit() {
  const [draftSaved, setDraftSaved] = useState(false);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row items-start justify-between">
        <View>
          <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
            Submit Audit
          </Text>
          <Text className="mt-1 text-base" style={{ color: adminTheme.slateSoft }}>
            {employeeScanOverview.subtitle} - Block A
          </Text>
        </View>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => setDraftSaved(true)}
            className="rounded-xl border px-5 py-2.5"
            style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
          >
            <Text className="text-sm font-medium" style={{ color: adminTheme.slate }}>
              Save as Draft
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace("/reports")}
            className="rounded-xl px-5 py-2.5"
            style={{ backgroundColor: adminTheme.employeePrimary }}
          >
            <Text className="text-sm font-semibold text-white">Submit Audit Report</Text>
          </Pressable>
        </View>
      </View>

      {draftSaved ? (
        <View
          className="mb-4 flex-row items-center rounded-[16px] border px-4 py-3"
          style={{ borderColor: adminTheme.infoBg, backgroundColor: adminTheme.infoBg }}
        >
          <Feather name="save" size={18} color={adminTheme.primary} />
          <Text className="ml-3 text-sm font-medium" style={{ color: adminTheme.primary }}>
            Draft saved locally
          </Text>
        </View>
      ) : null}

      <View className="mb-5">
        <SummaryStrip />
      </View>

      <View
        className="mb-5 rounded-[20px] border bg-white p-5"
        style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
      >
        <Text className="mb-4 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
          Mismatch preview - please review before submitting
        </Text>
        {employeeMismatchPreview.map((item, index) => {
          const [title, status] = item.split(" - ");

          return (
            <View
              key={item}
              className={`flex-row items-center justify-between py-3 ${
                index < employeeMismatchPreview.length - 1 ? "border-b" : ""
              }`}
              style={
                index < employeeMismatchPreview.length - 1
                  ? { borderColor: adminTheme.border }
                  : undefined
              }
            >
              <Text style={{ color: adminTheme.slate }}>{title}</Text>
              <Text style={{ color: adminTheme.slateSoft }}>{status}</Text>
            </View>
          );
        })}
      </View>

      <SubmissionFormCard />
    </ScrollView>
  );
}

function MobileEmployeeSubmit() {
  const [draftSaved, setDraftSaved] = useState(false);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="border-b px-4 pb-4 pt-3" style={{ borderColor: adminTheme.border }}>
        <View className="flex-row items-start">
          <Pressable
            onPress={() => router.push("/audits")}
            className="mr-3 mt-1 h-9 w-9 items-center justify-center rounded-[12px] border"
            style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
          >
            <Feather name="chevron-left" size={18} color={adminTheme.slateSoft} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
              Submit Audit
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
              {employeeScanOverview.subtitle} - Block A
            </Text>
          </View>
        </View>
      </View>

      {draftSaved ? (
        <View className="px-4 pt-4">
          <View
            className="flex-row items-center rounded-[16px] border px-4 py-3"
            style={{ borderColor: adminTheme.infoBg, backgroundColor: adminTheme.infoBg }}
          >
            <Feather name="save" size={18} color={adminTheme.primary} />
            <Text className="ml-3 text-sm font-medium" style={{ color: adminTheme.primary }}>
              Draft saved locally
            </Text>
          </View>
        </View>
      ) : null}

      <View className="px-4 pt-4">
        <SummaryStrip />
      </View>

      <View className="px-4 pt-4">
        <View
          className="rounded-[20px] border bg-white p-5"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          <Text className="mb-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
            Mismatches before submit
          </Text>
          {employeeMismatchPreview.map((item, index) => {
            const [title, status] = item.split(" - ");

            return (
              <View
                key={item}
                className={`flex-row items-center justify-between py-3 ${
                  index < employeeMismatchPreview.length - 1 ? "border-b" : ""
                }`}
                style={
                  index < employeeMismatchPreview.length - 1
                    ? { borderColor: adminTheme.border }
                    : undefined
                }
              >
                <Text style={{ color: adminTheme.slate }}>{title}</Text>
                <Text style={{ color: adminTheme.slateSoft }}>{status}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View className="px-4 pt-4">
        <SubmissionFormCard />
      </View>

      <View className="px-4 pt-4">
        <Pressable
          onPress={() => router.replace("/reports")}
          className="items-center rounded-[18px] px-5 py-4"
          style={{ backgroundColor: adminTheme.employeePrimary }}
        >
          <Text className="text-base font-semibold text-white">Submit Audit Report</Text>
        </Pressable>
      </View>

      <View className="px-4 pt-3">
        <Pressable
          onPress={() => setDraftSaved(true)}
          className="items-center rounded-[18px] border px-5 py-4"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          <Text className="text-base font-semibold" style={{ color: adminTheme.slate }}>
            Save as Draft
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function EmployeeSubmitAuditScreen() {
  const { width } = useWindowDimensions();

  return width < 1024 ? <MobileEmployeeSubmit /> : <DesktopEmployeeSubmit />;
}
