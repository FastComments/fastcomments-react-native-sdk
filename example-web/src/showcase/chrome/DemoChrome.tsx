import { useState } from 'react';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { ShellTheme } from './shell-theme';

export interface DemoTag {
    label: string;
    brand?: boolean;
}

export interface DemoChromeProps {
    shell: ShellTheme;
    breadcrumb: string;
    title: string;
    subtitle: string;
    tags?: DemoTag[];
    /** Height of the live-widget panel (the widget renders its own scroll inside). */
    panelHeight: number;
    code?: string;
    codeLabel?: string;
    children: ReactNode;
}

// Equivalent of the React showcase's _DemoChrome: breadcrumb + title + subtitle +
// tags, a bordered panel holding the live widget, and a copy-paste code block.
export function DemoChrome({ shell, breadcrumb, title, subtitle, tags, panelHeight, code, codeLabel, children }: DemoChromeProps) {
    return (
        <View style={{ gap: 24 }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: shell.border, paddingBottom: 18, gap: 8 }}>
                <Text style={{ fontFamily: shell.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: shell.inkMute }}>
                    {breadcrumb}
                </Text>
                <Text style={{ fontFamily: shell.display, fontWeight: '700', fontSize: 28, letterSpacing: -0.5, color: shell.ink }}>
                    {title}
                </Text>
                <Text style={{ fontFamily: shell.body, color: shell.inkDim, fontSize: 15, lineHeight: 23, maxWidth: 660 }}>
                    {subtitle}
                </Text>
                {tags && tags.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                        {tags.map((t) => (
                            <View
                                key={t.label}
                                style={{
                                    paddingVertical: 6,
                                    paddingHorizontal: 11,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: t.brand ? shell.accentB : shell.borderStrong,
                                    backgroundColor: t.brand ? 'rgba(132,83,237,0.16)' : shell.subtle,
                                }}
                            >
                                <Text
                                    style={{
                                        fontFamily: shell.mono,
                                        fontSize: 10.5,
                                        letterSpacing: 1.6,
                                        textTransform: 'uppercase',
                                        color: t.brand ? shell.accentB : shell.inkDim,
                                    }}
                                >
                                    {t.label}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : null}
            </View>

            <View
                style={{
                    height: panelHeight,
                    borderWidth: 1,
                    borderColor: shell.border,
                    borderRadius: 18,
                    overflow: 'hidden',
                    backgroundColor: shell.panel,
                }}
            >
                {children}
            </View>

            {code ? <CodePanel shell={shell} code={code} label={codeLabel} /> : null}
        </View>
    );
}

function CodePanel({ shell, code, label }: { shell: ShellTheme; code: string; label?: string }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard
                .writeText(code)
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                })
                .catch(() => {});
        }
    };

    return (
        <View style={{ borderWidth: 1, borderColor: shell.border, borderRadius: 18, overflow: 'hidden', backgroundColor: shell.panel }}>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    borderBottomWidth: 1,
                    borderBottomColor: shell.border,
                }}
            >
                <Text style={{ fontFamily: shell.mono, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', color: shell.inkMute }}>
                    {label ?? 'App.tsx'}
                </Text>
                {Platform.OS === 'web' ? (
                    <Pressable
                        onPress={copy}
                        style={{ borderWidth: 1, borderColor: shell.borderStrong, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 }}
                    >
                        <Text style={{ fontFamily: shell.mono, fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', color: shell.inkDim }}>
                            {copied ? 'Copied' : 'Copy'}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
            <ScrollView horizontal style={{ backgroundColor: shell.codeBg }} contentContainerStyle={{ padding: 18 }}>
                <Text style={{ fontFamily: shell.mono, fontSize: 12.5, lineHeight: 21, color: shell.ink }}>{code}</Text>
            </ScrollView>
        </View>
    );
}
