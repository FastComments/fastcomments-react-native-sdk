import { Pressable, ScrollView, Text, View } from 'react-native';
import type { ShellTheme, ThemeMode } from './shell-theme';
import type { ShowcaseEntry, WidgetKey } from '../registry';

export function ThemeToggle({ shell, mode, onChange }: { shell: ShellTheme; mode: ThemeMode; onChange: (m: ThemeMode) => void }) {
    return (
        <View
            style={{
                flexDirection: 'row',
                borderWidth: 1,
                borderColor: shell.borderStrong,
                borderRadius: 999,
                padding: 3,
                alignSelf: 'flex-start',
                backgroundColor: shell.subtle,
            }}
        >
            {(['light', 'dark'] as ThemeMode[]).map((m) => {
                const active = m === mode;
                return (
                    <Pressable
                        key={m}
                        onPress={() => onChange(m)}
                        style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: active ? shell.accentA : 'transparent' }}
                    >
                        <Text style={{ fontFamily: shell.mono, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', color: active ? '#ffffff' : shell.inkMute }}>
                            {m}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

function NavItem({ shell, entry, active, onPress }: { shell: ShellTheme; entry: ShowcaseEntry; active: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: active ? shell.accentB : 'transparent',
                backgroundColor: active ? shell.railTint : 'transparent',
                gap: 4,
            }}
        >
            <Text style={{ fontFamily: shell.display, fontWeight: '600', fontSize: 14, color: shell.ink }}>{entry.label}</Text>
            <Text style={{ fontFamily: shell.body, fontSize: 12, color: shell.inkMute }}>{entry.hint}</Text>
        </Pressable>
    );
}

interface RailProps {
    shell: ShellTheme;
    widgets: ShowcaseEntry[];
    selected: WidgetKey | 'home';
    onSelect: (key: WidgetKey | 'home') => void;
    mode: ThemeMode;
    onToggleMode: (m: ThemeMode) => void;
    width: number;
}

export function Rail({ shell, widgets, selected, onSelect, mode, onToggleMode, width }: RailProps) {
    return (
        <View style={{ width, borderRightWidth: 1, borderRightColor: shell.border, backgroundColor: shell.panel }}>
            <View style={{ flex: 1, padding: 22, gap: 22 }}>
                <Pressable onPress={() => onSelect('home')} style={{ gap: 3 }}>
                    <Text style={{ fontFamily: shell.display, fontWeight: '700', fontSize: 17, letterSpacing: -0.3, color: shell.ink }}>FastComments</Text>
                    <Text style={{ fontFamily: shell.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: shell.inkMute }}>
                        react native · showcase
                    </Text>
                </Pressable>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingBottom: 4 }}>
                        <Text style={{ fontFamily: shell.mono, fontSize: 10.5, letterSpacing: 2, color: shell.accentC }}>01</Text>
                        <Text style={{ fontFamily: shell.mono, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', color: shell.inkDim }}>Widgets</Text>
                    </View>
                    {widgets.map((entry) => (
                        <NavItem key={entry.key} shell={shell} entry={entry} active={selected === entry.key} onPress={() => onSelect(entry.key)} />
                    ))}
                </ScrollView>

                <View style={{ gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: shell.border }}>
                    <ThemeToggle shell={shell} mode={mode} onChange={onToggleMode} />
                    <View style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: shell.border, borderRadius: 6, backgroundColor: shell.subtle, paddingVertical: 6, paddingHorizontal: 9 }}>
                        <Text style={{ fontFamily: shell.mono, fontSize: 11.5, color: shell.inkDim }}>npm i fastcomments-react-native-sdk</Text>
                    </View>
                    <Text style={{ fontFamily: shell.body, fontSize: 11.5, color: shell.inkMute }}>fastcomments.com</Text>
                </View>
            </View>
        </View>
    );
}

interface MobileTopBarProps {
    shell: ShellTheme;
    title: string;
    onBack: () => void;
    mode: ThemeMode;
    onToggleMode: (m: ThemeMode) => void;
}

export function MobileTopBar({ shell, title, onBack, mode, onToggleMode }: MobileTopBarProps) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: shell.border,
                backgroundColor: shell.panel,
            }}
        >
            <Pressable onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: shell.display, fontSize: 16, color: shell.accentB }}>{'←'}</Text>
                <Text style={{ fontFamily: shell.display, fontWeight: '700', fontSize: 16, color: shell.ink }}>{title}</Text>
            </Pressable>
            <ThemeToggle shell={shell} mode={mode} onChange={onToggleMode} />
        </View>
    );
}
