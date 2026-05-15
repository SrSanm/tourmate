import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  orderBy, 
  limit 
} from 'firebase/firestore';

// 1. CREACIÓN DEL CONTEXTO
const TourContext = createContext();

// 2. HOOK PERSONALIZADO PARA CONSUMIR EL CONTEXTO
export const useTours = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTours debe usarse dentro de un TourProvider');
  }
  return context;
};

// 3. PROVEEDOR DEL CONTEXTO
export const TourProvider = ({ children }) => {
  const [tours, setTours] = useState([]);
  const [featuredTours, setFeaturedTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    category: 'all',
    searchQuery: '',
    minPrice: 0,
    maxPrice: Infinity
  });

  /**
   * CARGA INICIAL: Suscripción a tours aprobados y activos
   * Usamos onSnapshot para que si un Admin aprueba algo, aparezca en el Home al instante.
   */
  useEffect(() => {
    setLoading(true);
    
    // Solo queremos tours aprobados por admin y marcados como activos
    const q = query(
      collection(db, "tours"),
      where("isApproved", "==", true),
      where("active", "==", true),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const toursList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTours(toursList);
        
        // Seteamos destacados (ej: los 3 más económicos o recientes)
        setFeaturedTours(toursList.slice(0, 3));
        
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error("Error procesando tours:", err);
        setError("Error al procesar los datos de las experiencias.");
        setLoading(false);
      }
    }, (err) => {
      console.error("Error en suscripción de tours:", err);
      // Si hay error de permisos, lo capturamos aquí
      if (err.code === 'permission-denied') {
        setError("No tienes permisos para leer las experiencias.");
      } else {
        setError("Error de conexión con la base de datos.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * LÓGICA DE FILTRADO (Lado del Cliente para velocidad)
   * Esto permite que mientras el usuario escribe o cambia categorías,
   * la UI responda en milisegundos sin ir a Firebase.
   */
  const getFilteredTours = useCallback(() => {
    return tours.filter(tour => {
      const matchCategory = filters.category === 'all' || tour.category === filters.category;
      const matchSearch = tour.name?.toLowerCase().includes(filters.searchQuery.toLowerCase()) || 
                          tour.description?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                          tour.location?.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchPrice = Number(tour.price) >= filters.minPrice && Number(tour.price) <= filters.maxPrice;

      return matchCategory && matchSearch && matchPrice;
    });
  }, [tours, filters]);

  /**
   * OBTENER UN TOUR POR ID
   * Útil para la página de detalle del tour (TourDetail.jsx)
   */
  const getTourById = (id) => {
    return tours.find(tour => tour.id === id);
  };

  /**
   * ACTUALIZAR FILTROS
   */
  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      searchQuery: '',
      minPrice: 0,
      maxPrice: Infinity
    });
  };

  /**
   * OBTENER TOURS POR GUÍA (No suscripción, bajo demanda)
   * Útil para ver el perfil de un guía específico
   */
  const getToursByGuide = async (guideId) => {
    try {
      const q = query(
        collection(db, "tours"),
        where("guideId", "==", guideId),
        where("isApproved", "==", true)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Error obteniendo tours del guía:", err);
      return [];
    }
  };

  // 4. VALORES EXPUESTOS POR EL CONTEXTO
  const value = {
    tours: getFilteredTours(), // Retornamos los tours ya filtrados
    allTours: tours,           // Por si necesitamos la lista cruda
    featuredTours,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    getTourById,
    getToursByGuide
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
};

/** * --- DOCUMENTACIÓN DE USO ---
 * * 1. En App.jsx:
 * <TourProvider> ... </TourProvider>
 * * 2. En cualquier componente (ej: HomePage.jsx):
 * const { tours, loading, updateFilters } = useTours();
 * * // Para buscar:
 * <input onChange={(e) => updateFilters({ searchQuery: e.target.value })} />
 * * // Para listar:
 * {tours.map(t => <Card key={t.id} tour={t} />)}
 */