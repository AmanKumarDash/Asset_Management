import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export default function PlaceholderScreen({
  title,
  description,
}: PlaceholderScreenProps) {
  return (
    <View className="flex-1 bg-[#fcfbf8] px-5 py-6">
      <View className="rounded-[28px] border border-[#e3ddd2] bg-white p-8">
        <View className="mb-6 h-14 w-14 items-center justify-center rounded-2xl bg-[#eef5fc]">
          <Feather name="layout" size={24} color="#1f5ea8" />
        </View>
        <Text className="text-3xl font-semibold text-[#172438]">{title}</Text>
        <Text className="mt-3 max-w-2xl text-base leading-7 text-[#6e655b]">
          {description}
        </Text>

        <View className="mt-8 rounded-2xl border border-dashed border-[#d9d1c5] bg-[#faf7f1] p-5">
          <Text className="text-base font-medium text-[#554e46]">
            This route is live and already using the shared sidebar layout.
          </Text>
          <Text className="mt-2 text-sm leading-6 text-[#7b7268]">
            We can now build each page independently without touching the routing shell again.
          </Text>
        </View>

        <Pressable className="mt-8 self-start rounded-xl bg-[#1f5ea8] px-5 py-3">
          <Text className="text-sm font-semibold text-white">Ready for the next page</Text>
        </Pressable>
      </View>
    </View>
  );
}
