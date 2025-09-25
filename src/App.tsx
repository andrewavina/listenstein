import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface CallData {
  avgHandleTimeSec: number;
  callsToday: number;
  durationSec: number;
  id: string;
  name: string;
  queue: string;
  status: string;
  type: string;
  updatedAt: string;
}

// Virtual List Hook for performance
const useVirtualList = (items: CallData[], containerHeight: number, itemHeight: number) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    visibleStart,
    setScrollTop
  };
};

// Optimized Row Component
const CallRow = React.memo(({ call, index }: { call: CallData; index: number }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-red-100 text-red-800';
      case 'away': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center p-3 border-b border-gray-200 hover:bg-gray-50 ${
      index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {call.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{call.name}</p>
              <p className="text-xs text-gray-500">ID: {call.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
              {call.status}
            </span>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{call.callsToday} calls</p>
              <p className="text-xs text-gray-500">Today</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{formatDuration(call.avgHandleTimeSec)}</p>
              <p className="text-xs text-gray-500">Avg Handle</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{call.queue}</p>
              <p className="text-xs text-gray-500">Queue</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CallRow.displayName = 'CallRow';

export default function Listenstein() {
  const [callData, setCallData] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState<{key: keyof CallData; direction: 'asc' | 'desc'}>({
    key: 'name',
    direction: 'asc'
  });
  
  const CONTAINER_HEIGHT = 600;
  const ITEM_HEIGHT = 80;

  // Load data (simulated - replace with your actual data loading)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Simulated data loading - replace with actual file read
        const mockData: CallData[] = Array.from({ length: 50000 }, (_, i) => ({
          id: `agent-${i + 1}`,
          name: `Agent ${String(i + 1).padStart(3, '0')}`,
          status: ['Available', 'Busy', 'Away'][Math.floor(Math.random() * 3)],
          callsToday: Math.floor(Math.random() * 50) + 1,
          avgHandleTimeSec: Math.floor(Math.random() * 600) + 60,
          durationSec: Math.floor(Math.random() * 3600),
          queue: ['Support', 'Sales', 'Billing', 'Technical'][Math.floor(Math.random() * 4)],
          type: 'Voice',
          updatedAt: new Date(Date.now() - Math.random() * 86400000).toISOString()
        }));
        
        setCallData(mockData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load data:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = callData;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(call => 
        call.name.toLowerCase().includes(term) ||
        call.id.toLowerCase().includes(term) ||
        call.queue.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(call => 
        call.status.toLowerCase() === filterStatus.toLowerCase()
      );
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      
      return 0;
    });
    
    return sorted;
  }, [callData, searchTerm, filterStatus, sortConfig]);

  const { visibleItems, totalHeight, offsetY, setScrollTop } = useVirtualList(
    processedData,
    CONTAINER_HEIGHT,
    ITEM_HEIGHT
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, [setScrollTop]);

  const handleSort = (key: keyof CallData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(callData.map(call => call.status))];
    return statuses.sort();
  }, [callData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Listenstein data...</p>
        </div>
      </div>
    );
  }

  console.log("App render: ")

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600">
            <h1 className="text-2xl font-bold text-white mb-2">🧪 Listenstein</h1>
            <p className="text-blue-100">High-performance virtualized list rendering • {callData.length.toLocaleString()} agents loaded</p>
          </div>

          {/* Controls */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-64">
                <input
                  type="text"
                  placeholder="Search agents, IDs, or queues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-600">
                Showing {processedData.length.toLocaleString()} of {callData.length.toLocaleString()} agents
              </div>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="px-6 py-2 border-b border-gray-200 bg-gray-50">
            <div className="flex gap-2 text-xs">
              <span className="text-gray-500">Sort by:</span>
              {(['name', 'status', 'callsToday', 'avgHandleTimeSec'] as const).map(key => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-2 py-1 rounded transition-colors ${
                    sortConfig.key === key
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {key === 'callsToday' ? 'Calls' : key === 'avgHandleTimeSec' ? 'Handle Time' : key}
                  {sortConfig.key === key && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Virtual List Container */}
          <div className="relative">
            <div
              className="overflow-auto"
              style={{ height: CONTAINER_HEIGHT }}
              onScroll={handleScroll}
            >
              <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                  {visibleItems.map((call) => (
                    <CallRow
                      key={call.id}
                      call={call}
                      index={processedData.indexOf(call)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <div>
                Rendering {visibleItems.length} of {processedData.length} rows • 
                Virtualized for optimal performance
              </div>
              <div>
                Item height: {ITEM_HEIGHT}px • Container: {CONTAINER_HEIGHT}px
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}