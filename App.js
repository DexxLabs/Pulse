import React, { useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import MainScreen from './src/MainScreen'


const App = () => {
  useEffect(() => {
    const init = async () => {
      // Perform setup tasks if needed
    };

    init().finally(async () => {
      await BootSplash.hide({ fade: true });
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#141414' }}>
      <StatusBar backgroundColor="#141414" barStyle="light-content" />
      <MainScreen/>
    </View>
  );
};

export default App;
