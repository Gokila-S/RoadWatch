import './SkeletonLoader.css'

export const SkeletonCard = ({ count = 3 }) => (
  <div className="skeleton-cards">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton-card-item" style={{ animationDelay: `${i * 0.15}s` }}>
        <div className="skeleton skeleton-card-header"></div>
        <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
        <div className="skeleton-card-footer">
          <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '12px' }}></div>
          <div className="skeleton" style={{ width: '60px', height: '24px', borderRadius: '12px' }}></div>
        </div>
      </div>
    ))}
  </div>
)

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="skeleton-table">
    <div className="skeleton-table-header">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="skeleton" style={{ height: '14px', width: `${60 + Math.random() * 40}%` }}></div>
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton-table-row" style={{ animationDelay: `${i * 0.1}s` }}>
        {[1,2,3,4,5].map(j => (
          <div key={j} className="skeleton" style={{ height: '14px', width: `${50 + Math.random() * 50}%` }}></div>
        ))}
      </div>
    ))}
  </div>
)

export const SkeletonMap = () => (
  <div className="skeleton-map">
    <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-lg)' }}></div>
    <div className="skeleton-map-overlay">
      <div className="skeleton-map-pin" style={{ top: '30%', left: '40%' }}></div>
      <div className="skeleton-map-pin" style={{ top: '50%', left: '60%' }}></div>
      <div className="skeleton-map-pin" style={{ top: '70%', left: '35%' }}></div>
    </div>
  </div>
)

export const SkeletonStat = ({ count = 4 }) => (
  <div className="skeleton-stats">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton-stat-item" style={{ animationDelay: `${i * 0.1}s` }}>
        <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '10px' }}></div>
        <div>
          <div className="skeleton" style={{ width: '80px', height: '24px', marginBottom: '6px' }}></div>
          <div className="skeleton" style={{ width: '60px', height: '12px' }}></div>
        </div>
      </div>
    ))}
  </div>
)
