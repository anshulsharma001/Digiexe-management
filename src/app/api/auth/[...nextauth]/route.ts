import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User } from "@/types";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide email and password");
        }

        try {
          // Sign in with Firebase Auth
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          );

          const firebaseUser = userCredential.user;

          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          if (!userDoc.exists()) {
            throw new Error("User not found in database");
          }

          const userData = userDoc.data() as User;

          if (!userData.isActive) {
            throw new Error("Your account has been deactivated");
          }

          // Update last login
          await updateDoc(doc(db, "users", firebaseUser.uid), {
            lastLoginAt: Timestamp.now(),
          });

          return {
            id: firebaseUser.uid,
            email: userData.email,
            name: userData.name,
            image: userData.avatar || null,
            role: userData.role,
          };
        } catch (error: any) {
          console.error("Auth error:", error);

          if (error.code === "auth/user-not-found") {
            throw new Error("No account found with this email");
          }
          if (error.code === "auth/wrong-password") {
            throw new Error("Invalid password");
          }
          if (error.code === "auth/invalid-email") {
            throw new Error("Invalid email address");
          }
          if (error.code === "auth/too-many-requests") {
            throw new Error("Too many failed attempts. Please try again later");
          }

          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
