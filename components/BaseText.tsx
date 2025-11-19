import { StyleSheet, Text } from 'react-native';

type Props = {
  text: string;
};

export default function BaseText({ text }: Props) {
  return (
    <Text style={styles.baseText}>{text}</Text>
  );
}

const styles = StyleSheet.create({
  baseText: {
    color: '#000',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'SourGummy',
    lineHeight: 20,
  },
});
