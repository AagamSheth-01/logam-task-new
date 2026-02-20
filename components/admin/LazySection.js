import React from 'react';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';
import useLazyLoad from '../../hooks/useLazyLoad';
import SkeletonLoader from './SkeletonLoader';

const LazySection = ({
  loadFn,
  renderContent,
  fallback,
  skeleton,
  dependencies = [],
  className = '',
  ...props
}) => {
  const { elementRef, hasIntersected } = useIntersectionObserver();
  const {
    data,
    loading,
    error,
    markVisible,
    hasLoaded
  } = useLazyLoad(loadFn, dependencies);

  React.useEffect(() => {
    if (hasIntersected && !hasLoaded) {
      markVisible();
    }
  }, [hasIntersected, hasLoaded, markVisible]);

  const content = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center p-8 text-red-600">
          <span>Error: {error}</span>
        </div>
      );
    }

    if (loading) {
      return skeleton || (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      );
    }

    if (data && renderContent) {
      return renderContent(data);
    }

    return fallback || null;
  };

  return (
    <div ref={elementRef} className={className} {...props}>
      {content()}
    </div>
  );
};

export default LazySection;