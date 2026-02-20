import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';

const PaginatedList = ({
  items = [],
  itemsPerPage = 20,
  renderItem,
  renderHeader,
  renderEmpty,
  className = '',
  ...props
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (items.length === 0) {
    return renderEmpty ? renderEmpty() : (
      <div className="text-center py-8 text-gray-500">
        No items to display
      </div>
    );
  }

  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <Button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <Button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>

        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, items.length)}
              </span>{' '}
              of <span className="font-medium">{items.length}</span> results
            </p>
          </div>

          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
              <Button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="rounded-l-md"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {pageNumbers.map((pageNum) => (
                <Button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-none"
                >
                  {pageNum}
                </Button>
              ))}

              <Button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
                className="rounded-r-md"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`} {...props}>
      {renderHeader && renderHeader()}

      <div className="divide-y divide-gray-200">
        {paginatedItems.map((item, index) => (
          <div key={index}>
            {renderItem(item, (currentPage - 1) * itemsPerPage + index)}
          </div>
        ))}
      </div>

      {renderPaginationControls()}
    </div>
  );
};

export default PaginatedList;