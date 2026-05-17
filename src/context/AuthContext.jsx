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

  /* =========================
     AUTH STATE & REAL-TIME PROFILE
  ========================= */
  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Si se desmonta un listener previo, lo cerramos
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Listener en tiempo real para cambios de rol o estado (active/approved)
      const ref = doc(db, "users", currentUser.uid);
      
      unsubProfile = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            setProfile(snap.data());
          } else {
            console.warn("El documento de perfil no existe en Firestore.");
            setProfile(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error("Error en el snapshot del perfil:", err);
          setProfile(null);
          setLoading(false); // Liberar carga incluso si falla la base de datos
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
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
      console.error("Login error:", error);
      return { success: false, error: error.code };
    }
  };

  /* =========================
     GOOGLE LOGIN
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
      return { success: false, error: error.code };
    }
  };

  /* =========================
     LOGOUT
  ========================= */
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  /* =========================
     VALUE OBJECT
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

  // Renderizar siempre el árbol para evitar congelar el Router de React
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};