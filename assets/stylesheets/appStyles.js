import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#25292e',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  backgroundImage: {
    paddingHorizontal: 0,
    marginHorizontal: 0,
    flex: 1,
    width: '100%',
  },
  textInput: {
    borderColor: 'gray',
    borderWidth: 1,
    fontFamily: 'SourGummy',
    margin: 10,
    backgroundColor: '#fff',
  },
  stepBar: {
    backgroundColor: '#b94ea5',
    height: 50,
    color: '#fff',
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  imageContainerTop: {
    width: '100%',
    alignItems: 'center',
  },
  imageContainerBottom: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  topInstructions: {
    width: '100%',
  },
  topText: {
    color: '#000',
    fontSize: 20,
    lineHeight: 20,
    fontFamily: 'SourGummy',
    textAlign: 'center',
  },
  footerContainer: {
    flex: 1 / 3,
    alignItems: 'center',
    marginBottom: 20,
  },
  listText: {
    color: '#fff',
    fontFamily: 'SourGummy',
    textAlign: 'center'
  }
});
