import { Feather } from "@expo/vector-icons";
import {
  Platform,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View
} from "react-native";

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
  const webInputResetStyle =
    Platform.OS === "web"
      ? ({
          outlineColor: "transparent",
          outlineWidth: 2,
          boxShadow: "none",
        } as unknown as TextStyle)
      : null;

  return (
<View
  className="h-12 flex-row items-center rounded-lg bg-white"
  style={{
    borderWidth: 1,
    borderColor: "#D1D5DB",
  }}
>
  <TextInput
    value={value}
    placeholder={placeholder}
    placeholderTextColor="#94A3B8"
    secureTextEntry={secureTextEntry}
    onChangeText={onChangeText}
    autoCapitalize="none"
    autoCorrect={false}
    className="flex-1 px-4 text-gray-800"
    style={[
      {
        height: "100%",
        borderWidth: 0,
        backgroundColor: "transparent",
      },
      Platform.OS === "web"
        ? ({
            outlineStyle: "none",
            outlineWidth: 0,
            boxShadow: "none",
          } as any)
        : null,
    ]}
  />

  {setShowPassword && (
    <TouchableOpacity
      onPress={() => setShowPassword(!showPassword)}
      style={{
        width: 48,
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Feather
        name={showPassword ? "eye-off" : "eye"}
        size={20}
        color="#64748B"
      />
    </TouchableOpacity>
  )}
</View>
  );
}
