import { useState, useEffect, useRef } from 'react';

const useLazyLoad = (loadFn, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasLoaded = useRef(false);
  const isVisible = useRef(false);

  const load = async () => {
    if (loading || hasLoaded.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await loadFn();
      setData(result);
      hasLoaded.current = true;
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const markVisible = () => {
    isVisible.current = true;
    if (!hasLoaded.current) {
      load();
    }
  };

  const reset = () => {
    hasLoaded.current = false;
    setData(null);
    setError(null);
  };

  return {
    data,
    loading,
    error,
    load,
    markVisible,
    reset,
    hasLoaded: hasLoaded.current
  };
};

export default useLazyLoad;