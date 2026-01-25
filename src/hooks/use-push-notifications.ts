"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function usePushNotifications(userId: string | undefined) {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window;
      setIsSupported(supported);

      if (supported && userId) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const existingSubscription = await registration.pushManager.getSubscription();

          if (existingSubscription) {
            setSubscription(existingSubscription);
            setIsSubscribed(true);
          }
        } catch (error) {
          console.error("Error checking push subscription:", error);
        }
      }
      setIsLoading(false);
    };

    checkSupport();
  }, [userId]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !userId) return false;

    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("Notification permission denied");
        return false;
      }

      // Subscribe to push notifications
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Save subscription to Firestore
      const subscriptionData = {
        userId,
        endpoint: sub.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(sub.getKey("p256dh")!),
          auth: arrayBufferToBase64(sub.getKey("auth")!),
        },
        createdAt: new Date(),
      };

      await setDoc(
        doc(db, "pushSubscriptions", `${userId}_${Date.now()}`),
        subscriptionData
      );

      setSubscription(sub);
      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      return false;
    }
  }, [isSupported, userId]);

  const unsubscribe = useCallback(async () => {
    if (!subscription || !userId) return false;

    try {
      await subscription.unsubscribe();

      // Remove subscription from Firestore
      const subscriptionsQuery = query(
        collection(db, "pushSubscriptions"),
        where("userId", "==", userId),
        where("endpoint", "==", subscription.endpoint)
      );
      const snapshot = await getDocs(subscriptionsQuery);

      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, "pushSubscriptions", docSnap.id));
      }

      setSubscription(null);
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error("Failed to unsubscribe from push notifications:", error);
      return false;
    }
  }, [subscription, userId]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
