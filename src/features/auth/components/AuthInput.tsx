import { View, Text, TextInput } from "react-native";

type Props = {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
};

export default function AuthInput({
  label,
  placeholder,
  secureTextEntry,
}: Props) {
  return (
    <View className="mb-4">
      <Text className="text-gray-600 mb-1">{label}</Text>

      <TextInput
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800 bg-white"
      />
    </View>
  );
}