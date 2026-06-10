// Minimal react-native stand-in for the node unit-test environment (the real
// package ships Flow-typed source node cannot parse). Only the VALUES the SDK
// imports at module scope belong here; types are erased at compile time.
export const StyleSheet = {
    hairlineWidth: 0.5,
};
