import { TouchableOpacity, Text } from "react-native";

type Props = {
  title: string;
  onPress?: () => void;
};

export default function AuthButton({ title, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-blue-600 py-3 rounded-lg items-center mt-2"
    >
      <Text className="text-white font-semibold text-base">{title}</Text>
    </TouchableOpacity>
  );
}