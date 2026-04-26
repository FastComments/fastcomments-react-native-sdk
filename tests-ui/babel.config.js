module.exports = {
    presets: [
        ['module:metro-react-native-babel-preset', { useTransformReactJSXExperimental: false }]
    ],
    plugins: [
        ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
    ]
};
