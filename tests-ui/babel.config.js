module.exports = {
    // RN 0.71+ ships the babel preset under @react-native/babel-preset
    // (metro-react-native-babel-preset is retired). It enables the automatic
    // JSX runtime itself, so no separate transform-react-jsx plugin is needed.
    presets: ['module:@react-native/babel-preset']
};
