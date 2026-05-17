import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import { auth, db, googleProvider } from "../firebase/firebaseConfig";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

/* =========================
   CONTEXTO
========================= */
const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};

/* =========================
   PROVIDER
========================= */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * AUTH STATE & REAL-TIME PROFILE
   * Este efecto maneja la persistencia de la sesión y los cambios en Firestore.
   */
  useEffect(() => {
    let unsubProfile = () => {};

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Escuchar cambios en el perfil de Firestore en tiempo real (status, rol, etc.)
      const ref = doc(db, "users", currentUser.uid);
      unsubProfile = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            setProfile(snap.data());
          }
          setLoading(false);
        },
        (err) => {
          console.error("Error snapshot perfil:", err);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubProfile();
    };
  }, []);

  /* =========================
     REGISTER
  ========================= */
  const register = async (email, password, name, role = "tourist") => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(res.user, { displayName: name });

      const profileData = {
        uid: res.user.uid,
        name,
        email,
        role,
        status: role === "guide" ? "pending" : "approved",
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", res.user.uid), profileData);
      return { success: true, profile: profileData };
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, error };
    }
  };

  /* =========================
     LOGIN
  ========================= */
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const docRef = doc(db, "users", userCredential.user.uid);
      const docSnap = await getDoc(docRef);

      return {
        success: true,
        profile: docSnap.exists() ? docSnap.data() : null
      };
    } catch (error) {
      return { success: false, error: error.code };
    }
  };

  /* =========================
     GOOGLE LOGIN (Corregido)
  ========================= */
  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const ref = doc(db, "users", res.user.uid);
      const snap = await getDoc(ref);

      let profileData;

      if (!snap.exists()) {
        profileData = {
          uid: res.user.uid,
          name: res.user.displayName,
          email: res.user.email,
          role: "tourist",
          status: "approved",
          createdAt: serverTimestamp(),
        };
        await setDoc(ref, profileData);
      } else {
        profileData = snap.data();
      }

      setProfile(profileData);
      return { success: true, profile: profileData };
    } catch (error) {
      console.error("Google login error:", error);
      return { success: false, error: error.code }; // Corregido retorno
    }
  };

  /* =========================
     LOGOUT
  ========================= */
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  /* =========================
     VALUE
  ========================= */
  const value = {
    user,
    profile,
    loading,
    register,
    login,
    loginWithGoogle,
    logout,
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
    updateUserInfo: async (data) => {
      if (!user) return;
      await updateDoc(doc(db, "users", user.uid), data);
    },
    isAdmin: profile?.role === "admin",
    isGuide: profile?.role === "guide",
    isTourist: profile?.role === "tourist",
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};