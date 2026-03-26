import { View, Text, TextInput } from "react-native";

type Props = {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
  value?: string;
  onChangeText?: (value: string) => void;
};

export default function AuthInput({
  label,
  placeholder,
  secureTextEntry,
  value,
  onChangeText,
}: Props) {
  return (
    <View className="mb-4">
      <Text className="text-gray-600 mb-1">{label}</Text>

      <TextInput
        value={value}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        onChangeText={onChangeText}
        className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800 bg-white"
      />
    </View>
  );
}
