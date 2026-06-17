import { Pressable, Text, View } from 'react-native';
import type { ShellTheme, ThemeMode } from '../chrome/shell-theme';
import { ThemeToggle } from '../chrome/nav';
import type { ShowcaseEntry, WidgetKey } from '../registry';

interface HomeScreenProps {
    shell: ShellTheme;
    widgets: ShowcaseEntry[];
    onSelect: (key: WidgetKey) => void;
    mode: ThemeMode;
    onToggleMode: (m: ThemeMode) => void;
    compact: boolean;
}

export function HomeScreen({ shell, widgets, onSelect, mode, onToggleMode, compact }: HomeScreenProps) {
    return (
        <View style={{ gap: 28 }}>
            <View style={{ gap: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <Text style={{ fontFamily: shell.mono, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: shell.inkMute }}>
                        fastcomments / react native · showcase
                    </Text>
                    {compact ? <ThemeToggle shell={shell} mode={mode} onChange={onToggleMode} /> : null}
                </View>
                <Text style={{ fontFamily: shell.display, fontWeight: '800', fontSize: compact ? 38 : 52, lineHeight: compact ? 42 : 56, letterSpacing: -1.5, color: shell.ink }}>
                    Comment infrastructure{'\n'}
                    <Text style={{ color: shell.accentB }}>for React Native.</Text>
                </Text>
                <Text style={{ fontFamily: shell.body, fontSize: 16, lineHeight: 26, color: shell.inkDim, maxWidth: 640 }}>
                    Every drop-in widget the SDK ships, running live against the public demo tenant and signed in with Simple SSO.
                    Tap a widget to see it working, copy the code, and lift it straight into your app.
                </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Text style={{ fontFamily: shell.mono, fontSize: 11, letterSpacing: 2, color: shell.inkMute }}>01</Text>
                <Text style={{ fontFamily: shell.display, fontWeight: '700', fontSize: 20, color: shell.ink }}>Widgets</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: shell.border }} />
                <Text style={{ fontFamily: shell.mono, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: shell.inkMute }}>
                    {widgets.length} components
                </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                {widgets.map((entry) => (
                    <Pressable
                        key={entry.key}
                        onPress={() => onSelect(entry.key)}
                        style={{
                            flexGrow: 1,
                            flexBasis: compact ? '100%' : 260,
                            minWidth: compact ? undefined : 260,
                            borderWidth: 1,
                            borderColor: shell.border,
                            borderRadius: 16,
                            backgroundColor: shell.panel,
                            padding: 22,
                            gap: 10,
                        }}
                    >
                        <Text style={{ fontFamily: shell.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: shell.accentC }}>
                            {entry.kind}
                        </Text>
                        <Text style={{ fontFamily: shell.display, fontWeight: '700', fontSize: 19, letterSpacing: -0.4, color: shell.ink }}>
                            {entry.label}
                        </Text>
                        <Text style={{ fontFamily: shell.body, fontSize: 13.5, lineHeight: 20, color: shell.inkDim }}>{entry.hint}</Text>
                        <Text style={{ fontFamily: shell.mono, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: shell.inkMute, marginTop: 4 }}>
                            Open example →
                        </Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}
