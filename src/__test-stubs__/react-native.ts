// Minimal react-native stand-in for the node unit-test environment (the real
// package ships Flow-typed source node cannot parse). Only the VALUES the SDK
// imports at module scope belong here; types are erased at compile time.
export const StyleSheet = {
    hairlineWidth: 0.5,
};

// Node unit tests run as the "native" platform: Platform.select returns the
// ios/native/default branch (never the web one).
export const Platform = {
    OS: 'ios' as const,
    select: <T,>(specifics: { web?: T; ios?: T; android?: T; native?: T; default?: T }): T | undefined =>
        specifics.ios ?? specifics.native ?? specifics.default,
};
