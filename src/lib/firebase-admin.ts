import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let app: App;

const getFirebaseAdmin = () => {
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccount) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
    }

    app = initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  } else {
    app = getApps()[0];
  }

  return app;
};

export const adminApp = getFirebaseAdmin();
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
