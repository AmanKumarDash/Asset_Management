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
      <Text className="mb-1 text-gray-600">{label}</Text>
      <View className="h-12 flex-row items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          className="h-12 flex-1 px-4 text-gray-800"
          style={{ outlineWidth: 0, textAlignVertical: "center" }}
        />

        {setShowPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="h-12 w-12 items-center justify-center"
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
