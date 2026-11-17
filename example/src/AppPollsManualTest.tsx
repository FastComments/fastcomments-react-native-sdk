import * as React from 'react';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FastCommentsLiveCommenting } from '../../index';
import type { FastCommentsRNConfig } from '../../src/types/react-native-config';

/**
 * Manual two-device poll testing. manual-test-users.json (gitignored) holds a test tenant with polls enabled and SSO
 * payloads for two users; pick a different user on each device. Generate it with a test tenant from the tests-ui
 * framework (createTestTenant + createCustomConfig({ pollCreation: 2 }) + makeSecureSSOPayload).
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testUsers: {
    tenantId: string;
    urlId: string;
    users: Array<{ label: string; sso: FastCommentsRNConfig['sso'] }>;
} = require('./manual-test-users.json');

export default function AppPollsManualTest() {
    const [config, setConfig] = useState<FastCommentsRNConfig | null>(null);

    if (!config) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', padding: 24, rowGap: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '600' }}>Pick a user for this device</Text>
                {testUsers.users.map(({ label, sso }) => (
                    <TouchableOpacity
                        key={label}
                        testID={`pickUser-${label}`}
                        style={{ padding: 16, borderRadius: 10, backgroundColor: '#333' }}
                        onPress={() =>
                            setConfig({
                                tenantId: testUsers.tenantId,
                                urlId: testUsers.urlId,
                                showLiveRightAway: true,
                                countAll: true,
                                sso,
                            })
                        }
                    >
                        <Text style={{ color: '#fff', fontSize: 16 }}>{label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <FastCommentsLiveCommenting config={config} />
        </View>
    );
}
