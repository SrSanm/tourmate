import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

const TourContext = createContext();

export const useTours = () => {
  const context = useContext(TourContext);
  if (!context) throw new Error('useTours debe usarse dentro de un TourProvider');
  return context;
};

export const TourProvider = ({ children }) => {
  const [tours, setTours]               = useState([]);
  const [featuredTours, setFeaturedTours] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [filters, setFilters]           = useState({
    category: 'all',
    searchQuery: '',
    minPrice: 0,
    maxPrice: Infinity
  });

  useEffect(() => {
    setLoading(true);

    // SIN orderBy → evita el error de índice compuesto en Firestore.
    // Ordenamos en el cliente después de recibir los datos.
    const q = query(
      collection(db, "tours"),
      where("isApproved", "==", true),
      where("active", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const toursList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Ordenar por createdAt descendente en el cliente
        toursList.sort((a, b) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        });

        setTours(toursList);
        setFeaturedTours(toursList.slice(0, 3));
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error("Error procesando tours:", err);
        setError("Error al procesar los datos.");
        setLoading(false);
      }
    }, (err) => {
      console.error("Error en suscripción de tours:", err);
      setError(
        err.code === 'permission-denied'
          ? "No tienes permisos para leer las experiencias."
          : "Error de conexión con la base de datos."
      );
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getFilteredTours = useCallback(() => {
    return tours.filter(tour => {
      const matchCategory = filters.category === 'all' || tour.category === filters.category;
      const q = filters.searchQuery.toLowerCase();
      const matchSearch = !q ||
        (tour.title || tour.name || '').toLowerCase().includes(q) ||
        (tour.description || '').toLowerCase().includes(q) ||
        (tour.location || '').toLowerCase().includes(q);
      const matchPrice =
        Number(tour.price) >= filters.minPrice &&
        Number(tour.price) <= filters.maxPrice;
      return matchCategory && matchSearch && matchPrice;
    });
  }, [tours, filters]);

  const getTourById     = (id) => tours.find(t => t.id === id);
  const updateFilters   = (newFilters) => setFilters(prev => ({ ...prev, ...newFilters }));
  const clearFilters    = () => setFilters({ category: 'all', searchQuery: '', minPrice: 0, maxPrice: Infinity });

  const getToursByGuide = async (guideId) => {
    try {
      const snap = await getDocs(
        query(collection(db, "tours"), where("guideId", "==", guideId), where("isApproved", "==", true))
      );
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error("Error obteniendo tours del guía:", err);
      return [];
    }
  };

  const value = {
    tours: getFilteredTours(),
    allTours: tours,
    featuredTours,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    getTourById,
    getToursByGuide
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};