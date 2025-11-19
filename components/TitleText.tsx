import { StyleSheet, Text } from 'react-native';

type Props = {
  text: string;
};

export default function TitleText({ text }: Props) {
  return (
    <Text style={styles.titleText}>{text}</Text>
  );
}

const styles = StyleSheet.create({
  titleText: {
    color: '#000',
    fontSize: 40,
    lineHeight: 40,
    textAlign: 'center',
    paddingBottom: 30,
    fontFamily: 'SourGummy',
    paddingTop:20,
  },
});
