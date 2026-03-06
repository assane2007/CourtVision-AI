import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useRevenueCat } from '../lib/revenuecat';
import { T } from '../lib/theme';
import { PurchasesPackage } from 'react-native-purchases';

export default function PaywallScreen() {
    const router = useRouter();
    const { packages, purchasePackage, restorePurchases, isPro, loading } = useRevenueCat();
    const [processing, setProcessing] = React.useState(false);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={T.color.brand.primary} />
            </View>
        );
    }

    if (isPro) {
        return (
            <View style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Feather name="check-circle" size={64} color={T.color.semantic.success} style={{ marginBottom: 20 }} />
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center' }}>
                    SUBSCRIPTION ACTIVE
                </Text>
                <Text style={{ color: '#888', fontSize: 14, marginTop: 10, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                    You currently have full access to CourtVision AI PRO.
                </Text>
                <TouchableOpacity
                    style={{ marginTop: 40, padding: 15, borderWidth: 1, borderColor: '#333' }}
                    onPress={() => router.back()}
                >
                    <Text style={{ color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>RETURN TO DASHBOARD</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handlePurchase = async (pkg: any) => {
        setProcessing(true);
        try {
            await purchasePackage(pkg);
            // On success, isPro becomes true, screen re-renders.
        } catch (error) {
            console.log('Purchase cancelled or failed', error);
        } finally {
            setProcessing(false);
        }
    };

    const handleRestore = async () => {
        setProcessing(true);
        try {
            await restorePurchases();
        } catch (error) {
            console.log('Restore failed', error);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: T.spacing[5], borderBottomWidth: 1, borderColor: '#222' }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Feather name="x" size={24} color="#888" />
                </TouchableOpacity>
                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: T.color.brand.primary, fontSize: 14, fontWeight: 'bold' }}>
                    UPGRADE_LINK
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: T.spacing[5] }}>
                <Animated.View entering={FadeInUp.duration(500)}>
                    <Text style={{ color: '#fff', fontSize: 32, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: 'bold', marginBottom: 10 }}>
                        UNLOCK PRO
                    </Text>
                    <Text style={{ color: '#888', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 20, marginBottom: 30 }}>
                        Gain unlimited access to AI shot tracking, PRE-COG cognitive training, and personalized digital twin insights.
                    </Text>
                </Animated.View>

                {packages.length === 0 ? (
                    <View style={{ padding: 20, backgroundColor: '#111', borderWidth: 1, borderColor: '#333' }}>
                        <Text style={{ color: '#888', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center' }}>
                            [NO PACKAGES CONFIGURED]
                        </Text>
                        <Text style={{ color: '#555', fontSize: 10, marginTop: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center' }}>
                            Configure RevenueCat in your environment variables and dashboard to see offers.
                        </Text>
                    </View>
                ) : (
                    packages.map((pkg: PurchasesPackage, index: number) => (
                        <Animated.View key={pkg.identifier} entering={FadeInDown.delay(index * 200).duration(400)}>
                            <TouchableOpacity
                                style={{
                                    borderWidth: 1, borderColor: T.color.brand.primary, backgroundColor: `${T.color.brand.primary}10`,
                                    padding: 20, marginBottom: 16, borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
                                }}
                                onPress={() => handlePurchase(pkg)}
                                disabled={processing}
                            >
                                <View>
                                    <Text style={{ color: '#fff', fontSize: 18, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: 'bold' }}>
                                        {pkg.product.title}
                                    </Text>
                                    <Text style={{ color: T.color.brand.primary, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 }}>
                                        {pkg.product.description}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ color: '#fff', fontSize: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: 'bold' }}>
                                        {pkg.product.priceString}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))
                )}
            </ScrollView>

            {/* Footer */}
            <View style={{ padding: T.spacing[5], borderTopWidth: 1, borderColor: '#222' }}>
                <TouchableOpacity onPress={handleRestore} disabled={processing} style={{ alignItems: 'center', padding: 10 }}>
                    {processing ? <ActivityIndicator color={T.color.brand.primary} size="small" /> : (
                        <Text style={{ color: '#666', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textDecorationLine: 'underline', fontSize: 12 }}>
                            RESTORE_PREVIOUS_PURCHASES
                        </Text>
                    )}
                </TouchableOpacity>
                <Text style={{ color: '#444', textAlign: 'center', fontSize: 10, marginTop: 10 }}>
                    Auto-renewing subscription. Cancel anytime from your device settings.
                </Text>
            </View>
        </SafeAreaView>
    );
}
