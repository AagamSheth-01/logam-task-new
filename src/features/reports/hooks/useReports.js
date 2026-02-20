/**
 * useReports Hook
 */

import { useEffect, useCallback } from 'react';
import useReportsStore from '../store/reportsStore.js';
import reportsApi from '../api/reportsApi.js';

export function useReports(initialFilters = {}, options = {}) {
  const { autoLoad = true } = options;

  const {
    reports,
    loading,
    error,
    generating,
    filters,
    setReports,
    setLoading,
    setError,
    setGenerating,
    setFilters,
    addReport: addReportToStore,
    removeReport: removeReportFromStore
  } = useReportsStore();

  const loadReports = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const mergedFilters = { ...filters, ...customFilters };
      const response = await reportsApi.getReports(mergedFilters);

      if (response.success) {
        setReports(response.reports || response.data || []);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, setReports, setLoading, setError]);

  const generateReport = useCallback(async (reportData) => {
    try {
      setGenerating(true);
      setError(null);

      const result = await reportsApi.generateReport(reportData);
      if (result.success) {
        addReportToStore(result.report || result.data);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [addReportToStore, setError, setGenerating]);

  const deleteReport = useCallback(async (reportId) => {
    try {
      const result = await reportsApi.deleteReport(reportId);
      if (result.success) {
        removeReportFromStore(reportId);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [removeReportFromStore, setError]);

  const exportReport = useCallback(async (reportId, format = 'pdf') => {
    try {
      const result = await reportsApi.exportReport(reportId, format);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [setError]);

  const getAttendanceReport = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const response = await reportsApi.getAttendanceReport(params);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [setLoading, setError]);

  const getTasksReport = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const response = await reportsApi.getTasksReport(params);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [setLoading, setError]);

  useEffect(() => {
    if (autoLoad) {
      setFilters(initialFilters);
      loadReports(initialFilters);
    }
  }, [autoLoad]);

  return {
    reports,
    loading,
    error,
    generating,
    filters,
    loadReports,
    generateReport,
    deleteReport,
    exportReport,
    getAttendanceReport,
    getTasksReport,
    setFilters
  };
}

export default useReports;
