import { Feather } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
  value?: string;
  onChangeText?: (value: string) => void;
  showPassword?: boolean;
  setShowPassword?: (value: boolean) => void;
};

export default function AuthInput({
  label,
  placeholder,
  secureTextEntry,
  value,
  onChangeText,
  showPassword,
  setShowPassword,
}: Props) {
  return (
    <View className="mb-4">
      <Text className="text-gray-600 mb-1">{label}</Text>
      <View className="flex-row items-center border border-gray-300 rounded-lg bg-white overflow-hidden">
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry}
          onChangeText={onChangeText}
          className="flex-1 px-4 py-3 text-gray-800"
          style={{ outlineWidth: 0 }}
        />

        {setShowPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="h-full items-center justify-center px-3 py-3"
            activeOpacity={0.7}
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}