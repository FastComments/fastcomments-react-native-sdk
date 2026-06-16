import { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { WIDGETS } from './registry';
import type { WidgetKey } from './registry';
import { getShellTheme } from './chrome/shell-theme';
import type { ThemeMode } from './chrome/shell-theme';
import { MobileTopBar, Rail } from './chrome/nav';
import { HomeScreen } from './screens/HomeScreen';

const WIDE_BREAKPOINT = 720;
const RAIL_WIDTH = 300;

export interface ShowcaseProps {
    initialKey?: WidgetKey | 'home';
    initialMode?: ThemeMode;
}

// Root of the component browser. Holds the two pieces of app state (which widget,
// which theme) and renders a desktop rail+stage or a mobile list+detail flow
// depending on viewport width. The global theme drives both the chrome and the
// SDK widget shown on screen.
export function Showcase({ initialKey, initialMode }: ShowcaseProps) {
    const [selected, setSelected] = useState<WidgetKey | 'home'>(initialKey ?? 'home');
    const [mode, setMode] = useState<ThemeMode>(initialMode ?? 'light');
    const { width, height } = useWindowDimensions();
    const wide = width >= WIDE_BREAKPOINT;
    const shell = useMemo(() => getShellTheme(mode), [mode]);

    const current = WIDGETS.find((w) => w.key === selected);
    const panelHeight = wide ? 640 : Math.max(440, height - 260);

    const stage = (
        <ScrollView style={{ flex: 1, backgroundColor: shell.bg }} contentContainerStyle={{ padding: wide ? 40 : 18, paddingBottom: 120 }}>
            {current ? (
                <current.Screen mode={mode} shell={shell} panelHeight={panelHeight} />
            ) : (
                <HomeScreen shell={shell} widgets={WIDGETS} onSelect={setSelected} mode={mode} onToggleMode={setMode} compact={!wide} />
            )}
        </ScrollView>
    );

    if (wide) {
        return (
            <View style={{ flex: 1, flexDirection: 'row', backgroundColor: shell.bg }}>
                <Rail shell={shell} widgets={WIDGETS} selected={selected} onSelect={setSelected} mode={mode} onToggleMode={setMode} width={RAIL_WIDTH} />
                {stage}
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: shell.bg }}>
            {current ? <MobileTopBar shell={shell} title={current.label} onBack={() => setSelected('home')} mode={mode} onToggleMode={setMode} /> : null}
            {stage}
        </View>
    );
}
