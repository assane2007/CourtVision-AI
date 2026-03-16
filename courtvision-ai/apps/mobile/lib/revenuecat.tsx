import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { useStore } from './store'; // Using main auth store
import { supabase, isDemoMode } from './supabase';

const APIKeys = {
    apple: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ?? '',
    google: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY ?? '',
};

const isRevenueCatConfigured =
    (APIKeys.apple.length > 5 && !APIKeys.apple.includes('placeholder')) ||
    (APIKeys.google.length > 5 && !APIKeys.google.includes('placeholder'));

interface RevenueCatContextState {
    packages: PurchasesPackage[];
    customerInfo: CustomerInfo | null;
    isPro: boolean;
    purchasePackage: (pack: PurchasesPackage) => Promise<void>;
    restorePurchases: () => Promise<void>;
    loading: boolean;
}

const RevenueCatContext = createContext<RevenueCatContextState | null>(null);

export const useRevenueCat = () => {
    const context = useContext(RevenueCatContext);
    if (!context) {
        throw new Error('useRevenueCat must be used within a RevenueCatProvider');
    }
    return context;
};

export const RevenueCatProvider = ({ children }: { children: React.ReactNode }) => {
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isPro, setIsPro] = useState(false);
    const [loading, setLoading] = useState(true);

    const user = useStore(state => state.user);
    const updateUser = useStore(state => state.updateUser);

    useEffect(() => {
        if (!isRevenueCatConfigured) {
            setLoading(false);
            return;
        }
        setup();
    }, [user?.id]);

    const setup = async () => {
        setLoading(true);
        try {
            if (Platform.OS === 'android') {
                Purchases.configure({ apiKey: APIKeys.google, appUserID: user?.id });
            } else if (Platform.OS === 'ios') {
                Purchases.configure({ apiKey: APIKeys.apple, appUserID: user?.id });
            }

            Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);

            // Fetch active offerings
            const offerings = await Purchases.getOfferings();
            if (offerings.current && offerings.current.availablePackages.length !== 0) {
                setPackages(offerings.current.availablePackages);
            }

            // Sync user entitlements
            const customerInfo = await Purchases.getCustomerInfo();
            setCustomerInfo(customerInfo);
            const isProNow = typeof customerInfo.entitlements.active['Premium'] !== 'undefined';
            setIsPro(isProNow);
            if (user?.plan !== (isProNow ? 'player' : 'free')) {
                updateUser({ plan: isProNow ? 'player' : 'free' });
            }

            // Listen for changes
            Purchases.addCustomerInfoUpdateListener((info) => {
                setCustomerInfo(info);
                const isProUpdated = typeof info.entitlements.active['Premium'] !== 'undefined';
                setIsPro(isProUpdated);
                updateUser({ plan: isProUpdated ? 'player' : 'free' });
            });
        } catch (e) {
            console.error('Error setting up RevenueCat', e);
        } finally {
            setLoading(false);
        }
    };

    const purchasePackage = async (pack: PurchasesPackage) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pack);
            setCustomerInfo(customerInfo);
            const isProNow = typeof customerInfo.entitlements.active['Premium'] !== 'undefined';
            setIsPro(isProNow);
            updateUser({ plan: isProNow ? 'player' : 'free' });
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error("Error purchasing package", e);
                throw e; // Pass upwards to be handled by UI toast
            }
        }
    };

    const restorePurchases = async () => {
        try {
            const customerInfo = await Purchases.restorePurchases();
            setCustomerInfo(customerInfo);
            const isProNow = typeof customerInfo.entitlements.active['Premium'] !== 'undefined';
            setIsPro(isProNow);
            updateUser({ plan: isProNow ? 'player' : 'free' });
        } catch (e) {
            console.error("Error restoring purchases", e);
            throw e;
        }
    };

    return (
        <RevenueCatContext.Provider value={{ packages, customerInfo, isPro, purchasePackage, restorePurchases, loading }}>
            {children}
        </RevenueCatContext.Provider>
    );
};
