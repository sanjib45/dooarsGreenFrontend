export default function Logo({ alt = 'DOOARS GREEN Logo', className = '' }) {
  // Use default large dimensions unless an override is provided in className
  const defaultSize = (className.includes('w-') || className.includes('!w-')) ? '' : 'w-32 h-32';
  
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-white shadow-2xl shadow-primary/20 ${defaultSize} ${className}`}
    >
      <img
        src="/logo.png"
        alt={alt}
        className="absolute inset-0 w-full h-full object-contain p-1.5"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
