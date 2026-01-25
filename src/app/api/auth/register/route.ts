import { NextRequest, NextResponse } from "next/server";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  Timestamp,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Role, User } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, invitationToken } = body;

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    let role: Role = "MEMBER";
    let invitationId: string | null = null;

    // Check if there's an invitation token
    if (invitationToken) {
      const invitationsQuery = query(
        collection(db, "invitations"),
        where("token", "==", invitationToken),
        where("status", "==", "PENDING")
      );

      const invitationsSnapshot = await getDocs(invitationsQuery);

      if (invitationsSnapshot.empty) {
        return NextResponse.json(
          { error: "Invalid or expired invitation" },
          { status: 400 }
        );
      }

      const invitationDoc = invitationsSnapshot.docs[0];
      const invitation = invitationDoc.data();

      // Check if invitation is expired
      if (invitation.expiresAt.toDate() < new Date()) {
        await updateDoc(doc(db, "invitations", invitationDoc.id), {
          status: "EXPIRED",
        });
        return NextResponse.json(
          { error: "Invitation has expired" },
          { status: 400 }
        );
      }

      // Check if email matches invitation
      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          { error: "Email does not match the invitation" },
          { status: 400 }
        );
      }

      role = invitation.role;
      invitationId = invitationDoc.id;
    } else {
      // Check if this is the first user (make them super admin)
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);

      if (usersSnapshot.empty) {
        role = "SUPER_ADMIN";
      }
    }

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const firebaseUser = userCredential.user;

    // Create user document in Firestore
    const userData: User = {
      id: firebaseUser.uid,
      email: email.toLowerCase(),
      name,
      role,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      notificationPreferences: {
        email: true,
        push: true,
        deadlineReminders: [48, 24, 12, 6, 1],
      },
    };

    await setDoc(doc(db, "users", firebaseUser.uid), userData);

    // Update invitation status if applicable
    if (invitationId) {
      await updateDoc(doc(db, "invitations", invitationId), {
        status: "ACCEPTED",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: firebaseUser.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);

    if (error.code === "auth/email-already-in-use") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    if (error.code === "auth/weak-password") {
      return NextResponse.json(
        { error: "Password is too weak" },
        { status: 400 }
      );
    }

    if (error.code === "auth/invalid-email") {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
