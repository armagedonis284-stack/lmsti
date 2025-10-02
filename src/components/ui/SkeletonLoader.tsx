import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-gray-200 rounded"></div>
    </div>
  );
};

interface ClassCardSkeletonProps {
  count?: number;
}

export const ClassCardSkeleton: React.FC<ClassCardSkeletonProps> = ({ count = 6 }) => {
  return (
    <React.Fragment>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-4 sm:p-6 border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <SkeletonLoader className="w-6 h-6 rounded-full bg-gray-300" />
              <div className="space-y-2">
                <SkeletonLoader className="h-4 w-24 bg-gray-300" />
                <SkeletonLoader className="h-3 w-16 bg-gray-300" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <SkeletonLoader className="h-3 w-20 bg-gray-300" />
          </div>

          <div className="flex gap-2">
            <SkeletonLoader className="h-9 flex-1 bg-gray-300" />
            <SkeletonLoader className="h-9 flex-1 bg-gray-300" />
          </div>
        </div>
      ))}
    </React.Fragment>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader
              key={colIndex}
              className={`h-4 ${colIndex === 0 ? 'w-1/4' : colIndex === columns - 1 ? 'w-1/6' : 'w-1/3'} bg-gray-300`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const FormSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <SkeletonLoader className="h-4 w-16 mb-2 bg-gray-300" />
          <SkeletonLoader className="h-10 w-full bg-gray-300" />
        </div>
        <div>
          <SkeletonLoader className="h-4 w-16 mb-2 bg-gray-300" />
          <SkeletonLoader className="h-10 w-full bg-gray-300" />
        </div>
      </div>

      <div>
        <SkeletonLoader className="h-4 w-20 mb-2 bg-gray-300" />
        <SkeletonLoader className="h-32 w-full bg-gray-300" />
      </div>

      <div className="flex gap-3">
        <SkeletonLoader className="h-10 flex-1 bg-gray-300" />
        <SkeletonLoader className="h-10 w-24 bg-gray-300" />
      </div>
    </div>
  );
};

export const DashboardCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <SkeletonLoader className="w-12 h-12 rounded-full bg-gray-300" />
            <div className="ml-4 flex-1">
              <SkeletonLoader className="h-4 w-20 mb-2 bg-gray-300" />
              <SkeletonLoader className="h-8 w-16 bg-gray-300" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export const ContentCardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <SkeletonLoader className="w-4 h-4 rounded-full bg-gray-300" />
                <SkeletonLoader className="h-5 w-16 bg-gray-300" />
              </div>
              <SkeletonLoader className="h-6 w-32 mb-2 bg-gray-300" />
              <SkeletonLoader className="h-4 w-24 bg-gray-300" />
            </div>
            <div className="flex gap-2 ml-4">
              <SkeletonLoader className="w-8 h-8 bg-gray-300" />
              <SkeletonLoader className="w-8 h-8 bg-gray-300" />
              <SkeletonLoader className="w-8 h-8 bg-gray-300" />
            </div>
          </div>

          <SkeletonLoader className="h-16 w-full mb-4 bg-gray-300" />

          <div className="flex items-center justify-between mb-4">
            <SkeletonLoader className="h-4 w-20 bg-gray-300" />
            <SkeletonLoader className="h-4 w-16 bg-gray-300" />
          </div>

          <div className="flex gap-2">
            <SkeletonLoader className="h-9 flex-1 bg-gray-300" />
            <SkeletonLoader className="h-9 flex-1 bg-gray-300" />
          </div>
        </div>
      ))}
    </>
  );
};

export const LeaderboardSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SkeletonLoader className="w-12 h-12 rounded-full bg-gray-300" />
              <div>
                <SkeletonLoader className="h-5 w-32 mb-1 bg-gray-300" />
                <SkeletonLoader className="h-4 w-24 bg-gray-300" />
              </div>
            </div>

            <div className="text-right">
              <SkeletonLoader className="h-8 w-16 mb-1 bg-gray-300" />
              <SkeletonLoader className="h-4 w-20 bg-gray-300" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, colIndex) => (
              <div key={colIndex}>
                <SkeletonLoader className="h-3 w-16 mb-1 bg-gray-300" />
                <SkeletonLoader className="h-4 w-12 bg-gray-300" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const SubmissionCardSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <SkeletonLoader className="h-5 w-40 mb-2 bg-gray-300" />
              <SkeletonLoader className="h-4 w-32 mb-2 bg-gray-300" />
              <div className="flex items-center gap-2 mb-3">
                <SkeletonLoader className="w-4 h-4 rounded-full bg-gray-300" />
                <SkeletonLoader className="h-3 w-20 bg-gray-300" />
              </div>
            </div>
          </div>

          <SkeletonLoader className="h-20 w-full mb-4 bg-gray-300" />

          <div className="flex gap-3">
            <SkeletonLoader className="h-9 flex-1 bg-gray-300" />
            <SkeletonLoader className="h-9 flex-1 bg-gray-300" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const StatsCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <SkeletonLoader className="w-8 h-8 rounded-full bg-gray-300" />
            <div className="ml-4">
              <SkeletonLoader className="h-4 w-20 mb-2 bg-gray-300" />
              <SkeletonLoader className="h-8 w-16 bg-gray-300" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default SkeletonLoader;