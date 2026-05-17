import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTours } from '../../context/TourContext'; 
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { 
  FiSearch, 
  FiMapPin, 
  FiClock, 
  FiStar, 
  FiFilter, 
  FiGrid, 
  FiList,
  FiChevronRight
} from 'react-icons/fi';
import '../../styles/TouristDashboard.css';

/**
 * ExploreTours.jsx - Versión 2.0 (Premium)
 * Maneja la visualización de experiencias, filtrado inteligente y 
 * estados de UI centralizados.
 */
const ExploreTours = () => {
  const { tours, loading, updateFilters, filters, error } = useTours();
  const { showNotification } = useUI();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Estados locales para la visualización de la UI
  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'
  const [localSearch, setLocalSearch] = useState(filters.searchQuery || "");

  // Categorías basadas en la oferta real de Medellín
  const categories = [
    { id: 'all', label: 'Todos', icon: '🌍' },
    { id: 'Gastronomía', label: 'Comida', icon: '🥘' },
    { id: 'Historia', label: 'Historia', icon: '📜' },
    { id: 'Aventura', label: 'Aventura', icon: '🧗' },
    { id: 'Cultura', label: 'Cultura', icon: '🎨' },
    { id: 'Nocturno', label: 'Nocturno', icon: '💃' }
  ];

  // Manejo del Input de búsqueda con pequeño debounce manual
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters({ searchQuery: localSearch });
    showNotification(`Buscando: ${localSearch}`, "info");
  };

  const handleCategoryClick = (catId) => {
    updateFilters({ category: catId });
    if (catId !== 'all') {
      showNotification(`Mostrando tours de ${catId}`, "success");
    }
  };

  // --- COMPONENTES INTERNOS ---

  const SkeletonCard = () => (
    <div className="skeleton-card">
      <div className="skeleton-image" />
      <div className="skeleton-text short" />
      <div className="skeleton-text long" />
    </div>
  );

  const ErrorDisplay = () => (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <h3>Hubo un problema al cargar los tours</h3>
      <p>{error || "Revisa tu conexión a internet o los permisos de Firebase."}</p>
      <button onClick={() => window.location.reload()} className="btn-retry">
        Reintentar ahora
      </button>
    </div>
  );

  // --- RENDER PRINCIPAL ---

  if (error) return <ErrorDisplay />;

  return (
    <div className="explore-main-container animate-fade-in">
      
      {/* 1. SECCIÓN DE BIENVENIDA */}
      <header className="explore-welcome">
        <div className="welcome-text">
          <h1>Hola, {profile?.name || 'Viajero'} 👋</h1>
          <p>¿Qué tesoro de Medellín quieres descubrir hoy?</p>
        </div>
        
        <div className="view-controls">
          <button 
            className={viewMode === 'grid' ? 'active' : ''} 
            onClick={() => setViewMode('grid')}
          >
            <FiGrid />
          </button>
          <button 
            className={viewMode === 'list' ? 'active' : ''} 
            onClick={() => setViewMode('list')}
          >
            <FiList />
          </button>
        </div>
      </header>

      {/* 2. BARRA DE BÚSQUEDA Y FILTROS */}
      <section className="search-and-filter">
        <form className="search-box" onSubmit={handleSearchSubmit}>
          <FiSearch className="icon" />
          <input 
            type="text" 
            placeholder="Comuna 13, Guatapé, Café..." 
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          <button type="submit" className="btn-search">Buscar</button>
        </form>

        <div className="category-scroll">
          {categories.map(cat => (
            <button 
              key={cat.id}
              className={`cat-chip ${filters.category === cat.id ? 'active' : ''}`}
              onClick={() => handleCategoryClick(cat.id)}
            >
              <span className="cat-icon">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* 3. GRILLA DE RESULTADOS */}
      <main className={`results-area ${viewMode}-layout`}>
        {loading ? (
          // Mostramos 6 esqueletos mientras carga
          [1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)
        ) : tours.length > 0 ? (
          tours.map(tour => (
            <div 
              key={tour.id} 
              className="tour-card-premium"
              onClick={() => navigate(`/tour/${tour.id}`)}
            >
              <div className="card-media">
                <img src={tour.imageUrl || tour.image || '/medellin-default.jpg'} alt={tour.title} />
                <div className="badge-overlay">
                  <span className="cat-badge">{tour.category}</span>
                  {tour.rating && <span className="rating-badge"><FiStar /> {tour.rating}</span>}
                </div>
              </div>
              
              <div className="card-content">
                <div className="content-top">
                  <h3>{tour.title || tour.name}</h3>
                  <p className="location"><FiMapPin /> {tour.location || 'Medellín, Antioquia'}</p>
                </div>
                
                <p className="description">
                  {tour.description?.substring(0, 85) || "Una experiencia increíble diseñada por locales para vivir la ciudad..." }...
                </p>

                <div className="content-bottom">
                  <div className="meta-info">
                    <span><FiClock /> {tour.duration || '3h'}</span>
                    <span className="price-tag">${Number(tour.price).toLocaleString()} COP</span>
                  </div>
                  <button className="btn-details">
                    Explorar <FiChevronRight />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            <img src="/no-results-illustration.svg" alt="Sin resultados" />
            <h3>No encontramos lo que buscas</h3>
            <p>Intenta con otra categoría o palabra clave.</p>
            <button onClick={() => updateFilters({category: 'all', searchQuery: ''})}>
              Limpiar filtros
            </button>
          </div>
        )}
      </main>

      {/* 4. ESTILOS EMBEBIDOS (Scoped) */}
      <style>{`
        .explore-main-container { padding: 30px; max-width: 1300px; margin: 0 auto; }
        
        /* Header */
        .explore-welcome { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .welcome-text h1 { font-size: 2.2rem; font-weight: 800; color: #1e293b; margin: 0; }
        .welcome-text p { color: #64748b; font-size: 1.1rem; }
        .view-controls { display: flex; background: #e2e8f0; padding: 5px; border-radius: 12px; }
        .view-controls button { border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; color: #64748b; background: transparent; transition: 0.3s; }
        .view-controls button.active { background: white; color: #ff5a3c; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }

        /* Search & Filters */
        .search-and-filter { margin-bottom: 40px; }
        .search-box { display: flex; align-items: center; background: white; padding: 10px 10px 10px 25px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: 25px; }
        .search-box input { border: none; outline: none; width: 100%; font-size: 1.1rem; margin-left: 15px; }
        .btn-search { background: #ff5a3c; color: white; border: none; padding: 12px 25px; border-radius: 15px; font-weight: 600; cursor: pointer; }
        
        .category-scroll { display: flex; gap: 15px; overflow-x: auto; padding-bottom: 15px; scrollbar-width: none; }
        .cat-chip { display: flex; align-items: center; gap: 10px; background: white; border: 1px solid #e2e8f0; padding: 12px 22px; border-radius: 50px; cursor: pointer; font-weight: 600; color: #475569; transition: 0.3s; white-space: nowrap; }
        .cat-chip.active { background: #1e293b; color: white; border-color: #1e293b; }
        .cat-icon { font-size: 1.2rem; }

        /* Grid Layout */
        .results-area.grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 30px; }
        .tour-card-premium { background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04); cursor: pointer; transition: 0.3s; border: 1px solid #f1f5f9; }
        .tour-card-premium:hover { transform: translateY(-10px); box-shadow: 0 20px 30px rgba(0,0,0,0.08); }
        
        .card-media { position: relative; height: 220px; }
        .card-media img { width: 100%; height: 100%; object-fit: cover; }
        .badge-overlay { position: absolute; top: 15px; left: 15px; right: 15px; display: flex; justify-content: space-between; }
        .cat-badge { background: rgba(255, 255, 255, 0.9); padding: 5px 12px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; color: #ff5a3c; }
        .rating-badge { background: #1e293b; color: white; padding: 5px 12px; border-radius: 10px; font-size: 0.8rem; display: flex; align-items: center; gap: 5px; }

        .card-content { padding: 20px; }
        .card-content h3 { font-size: 1.3rem; color: #1e293b; margin: 0 0 8px 0; }
        .location { color: #64748b; font-size: 0.9rem; display: flex; align-items: center; gap: 5px; margin-bottom: 15px; }
        .description { color: #64748b; font-size: 0.95rem; line-height: 1.5; margin-bottom: 20px; }
        
        .content-bottom { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; pt: 15px; }
        .meta-info { display: flex; flex-direction: column; }
        .meta-info span:first-child { font-size: 0.85rem; color: #94a3b8; display: flex; align-items: center; gap: 4px; }
        .price-tag { font-size: 1.2rem; font-weight: 800; color: #ff5a3c; }
        
        .btn-details { background: #f8fafc; border: none; padding: 10px 15px; border-radius: 12px; color: #1e293b; font-weight: 600; display: flex; align-items: center; gap: 5px; cursor: pointer; transition: 0.3s; }
        .btn-details:hover { background: #ff5a3c; color: white; }

        /* Skeleton Animation */
        .skeleton-card { background: #fff; border-radius: 24px; height: 400px; padding: 20px; }
        .skeleton-image { background: #f1f5f9; height: 200px; border-radius: 15px; margin-bottom: 15px; animation: pulse 1.5s infinite; }
        .skeleton-text { background: #f1f5f9; height: 20px; border-radius: 10px; margin-bottom: 10px; animation: pulse 1.5s infinite; }
        .skeleton-text.short { width: 40%; }
        .skeleton-text.long { width: 90%; }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

        /* Responsive */
        @media (max-width: 768px) {
          .explore-main-container { padding: 15px; }
          .explore-welcome { flex-direction: column; align-items: flex-start; gap: 20px; }
          .search-box { padding: 5px 5px 5px 15px; }
          .results-area.grid-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default ExploreTours;