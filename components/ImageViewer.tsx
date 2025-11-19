import { View, StyleSheet } from "react-native";
import { Image, ImageSource } from 'expo-image';

type Props = {
  imgSource: ImageSource;
  style: any;
};

export default function ImageViewer({ imgSource, style }: Props) {
  return <Image source={ imgSource } style={style} />;
}
