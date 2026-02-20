import React from 'react';

const SkeletonLoader = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    {...props}
  />
);

export const CardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
    <div className="flex items-center justify-between mb-4">
      <SkeletonLoader className="h-4 w-24" />
      <SkeletonLoader className="h-8 w-8 rounded-full" />
    </div>
    <SkeletonLoader className="h-8 w-16 mb-2" />
    <SkeletonLoader className="h-3 w-32" />
  </div>
);

export const StatCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <SkeletonLoader className="h-3 w-20 mb-2" />
        <SkeletonLoader className="h-6 w-12" />
      </div>
      <SkeletonLoader className="h-10 w-10 rounded-full" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="bg-white rounded-lg shadow border border-gray-200">
    <div className="p-6 border-b border-gray-200">
      <SkeletonLoader className="h-5 w-32" />
    </div>
    <div className="p-6">
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <SkeletonLoader className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <SkeletonLoader className="h-4 w-32 mb-1" />
              <SkeletonLoader className="h-3 w-24" />
            </div>
            <SkeletonLoader className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <SkeletonLoader className="h-8 w-48 mb-2" />
        <SkeletonLoader className="h-4 w-64" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TableSkeleton rows={5} />
        <TableSkeleton rows={5} />
      </div>
    </div>
  </div>
);

export default SkeletonLoader;