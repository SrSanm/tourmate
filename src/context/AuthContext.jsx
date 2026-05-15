import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * ESCUCHADOR EN TIEMPO REAL DEL PERFIL
   * Esto es vital: si el Admin aprueba a un guía en Firestore, 
   * el estado de la app cambia instantáneamente sin recargar.
   */
  useEffect(() => {
    let unsubscribeProfile = () => {};

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Suscripción en tiempo real al documento del usuario
        const userRef = doc(db, "users", firebaseUser.uid);
        unsubscribeProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data());
          } else {
            // Si el usuario existe en Auth pero no en Firestore (raro pero posible)
            setProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.error("Error en Snapshot de Perfil:", err);
          setLoading(false);
        });

      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubscribeProfile();
    };
  }, []);

  /**
   * LÓGICA DE REGISTRO EN FIRESTORE (REUTILIZABLE)
   */
  const saveUserInFirestore = async (userAuth, additionalData = {}) => {
    const userRef = doc(db, "users", userAuth.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      const { email, displayName, photoURL } = userAuth;
      const role = additionalData.role || "tourist";
      
      // Si el rol es guía, nace con estado 'pending'
      const status = role === "guide" ? "pending" : "active";

      const userData = {
        uid: userAuth.uid,
        email,
        displayName: displayName || additionalData.displayName || "Usuario de TourMate",
        photoURL: photoURL || "",
        role: role,
        status: status, // pending, approved, rejected, active
        medellinPass: false, // Ejemplo de feature adicional
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        ...additionalData
      };

      await setDoc(userRef, userData);
      return userData;
    }
    
    // Si ya existe, actualizamos el último login
    await updateDoc(userRef, { lastLogin: serverTimestamp() });
    return snap.data();
  };

  /**
   * LOGIN TRADICIONAL
   */
  const login = async (email, password) => {
    try {
      setAuthError(null);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profileData = await saveUserInFirestore(cred.user);
      return { user: cred.user, profile: profileData };
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  /**
   * LOGIN CON GOOGLE (Corregido y con validación de roles)
   */
  const loginWithGoogle = async () => {
    try {
      setAuthError(null);
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      
      // Google siempre entra como turista por defecto si es cuenta nueva
      const profileData = await saveUserInFirestore(cred.user, { role: "tourist" });
      
      return { user: cred.user, profile: profileData };
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  /**
   * REGISTRO DE NUEVA CUENTA
   */
  const register = async (email, password, displayName, role = "tourist") => {
    try {
      setAuthError(null);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      // Actualizamos el nombre en el objeto de Auth de Firebase
      await updateProfile(cred.user, { displayName });

      // Creamos el documento en Firestore
      const profileData = await saveUserInFirestore(cred.user, { 
        displayName, 
        role 
      });

      return { user: cred.user, profile: profileData };
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  /**
   * ACTUALIZAR PERFIL (Útil para la página de ajustes)
   */
  const updateUserSettings = async (data) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, data);
      // El onSnapshot se encargará de actualizar el estado 'profile'
    } catch (err) {
      console.error("Error al actualizar perfil:", err);
      throw err;
    }
  };

  /**
   * CERRAR SESIÓN
   */
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  }, []);

  /**
   * RECUPERACIÓN DE CONTRASEÑA
   */
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      throw err;
    }
  };

  // Valores expuestos
  const value = {
    user,
    profile,
    loading,
    authError,
    login,
    loginWithGoogle,
    register,
    logout,
    resetPassword,
    updateUserSettings,
    isAdmin: profile?.role === "admin",
    isGuide: profile?.role === "guide",
    isApproved: profile?.status === "approved" || profile?.role === "tourist",
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}