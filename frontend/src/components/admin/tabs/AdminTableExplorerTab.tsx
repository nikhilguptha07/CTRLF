import React, { useEffect, useState } from 'react';
import { 
  Table, 
  Search, 
  RefreshCw, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { AdminDetailModal } from '../AdminDetailModal';
import type { AdminDetailItem } from '../AdminDetailModal';

const APPROVED_TABLES = [
  'USERS',
  'CAMERAS',
  'VIDEO_FILES',
  'SEARCH_SESSIONS',
  'SEARCH_TARGETS',
  'DETECTIONS',
  'OBJECT_TRACKS',
  'SEARCH_RESULTS',
  'CAMERA_EVENTS',
  'AUDIT_LOGS',
] as const;

interface AdminTableExplorerTabProps {
  initialTable?: string;
}

export const AdminTableExplorerTab: React.FC<AdminTableExplorerTabProps> = ({ initialTable = 'USERS' }) => {
  const [selectedTable, setSelectedTable] = useState(initialTable);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurgingTable, setIsPurgingTable] = useState(false);
  const [isDeletingRow, setIsDeletingRow] = useState(false);
  const [selectedRowRecordId, setSelectedRowRecordId] = useState<string | number | null>(null);

  // Detail Modal for specific table row
  const [selectedRowDetail, setSelectedRowDetail] = useState<AdminDetailItem | null>(null);

  const fetchTableData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAdminTableExplorer(selectedTable, {
        page,
        limit: 15,
        search,
      });
      setColumns(data.columns);
      setRows(data.rows);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err?.message || `Failed to fetch data for ${selectedTable}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [selectedTable, page]);

  const handleTableChange = (table: string) => {
    setSelectedTable(table);
    setSearch('');
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTableData();
  };

  const handlePurgeCurrentTable = async () => {
    if (!window.confirm(`Are you sure you want to permanently clear all records from table ${selectedTable}?`)) return;
    setIsPurgingTable(true);
    try {
      const res = await apiClient.clearAdminTable(selectedTable);
      alert(`Table ${selectedTable} cleared successfully (${res.recordsRemoved} rows removed).`);
      await fetchTableData();
    } catch (err: any) {
      alert(`Failed to clear table: ${err?.message || err}`);
    } finally {
      setIsPurgingTable(false);
    }
  };

  const handleDeleteCurrentRow = async () => {
    if (!selectedRowRecordId) return;
    if (!window.confirm(`Are you sure you want to delete record ${selectedRowRecordId} from ${selectedTable}?`)) return;
    setIsDeletingRow(true);
    try {
      await apiClient.deleteAdminTableRow(selectedTable, selectedRowRecordId);
      setSelectedRowDetail(null);
      setSelectedRowRecordId(null);
      await fetchTableData();
    } catch (err: any) {
      alert(`Failed to delete record: ${err?.message || err}`);
    } finally {
      setIsDeletingRow(false);
    }
  };

  const handleRowClick = (row: Record<string, any>) => {
    const pk = row.ID ?? row.USER_ID ?? row.CAMERA_ID ?? row.SEARCH_ID ?? row.DETECTION_ID ?? row.TRACK_ID ?? row.EVENT_ID;
    setSelectedRowRecordId(pk !== undefined && pk !== null ? String(pk) : null);

    const fields = columns.map((col) => {
      const val = row[col];
      let displayVal: string;
      if (val === null || val === undefined) {
        displayVal = 'NULL';
      } else if (typeof val === 'object') {
        displayVal = JSON.stringify(val);
      } else {
        displayVal = String(val);
      }
      return { label: col, value: displayVal };
    });

    setSelectedRowDetail({
      title: `${selectedTable} Record`,
      subtitle: `Primary Key / ID: ${pk || 'Record'}`,
      fields,
      rawJson: row,
    });
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {/* Table Selector & Search Controls */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        {/* Table Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {APPROVED_TABLES.map((table) => (
            <button
              key={table}
              type="button"
              onClick={() => handleTableChange(table)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                selectedTable === table
                  ? 'bg-[#4361ee] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {table}
            </button>
          ))}
        </div>

        {/* Search inside table */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search within ${selectedTable}...`}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </form>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">
              Table: <strong className="text-slate-900">{selectedTable}</strong> ({total} records)
            </span>

            <button
              type="button"
              onClick={handlePurgeCurrentTable}
              disabled={isPurgingTable || total === 0}
              title={`Purge all records from table ${selectedTable}`}
              className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isPurgingTable ? 'Purging...' : 'Purge Table'}</span>
            </button>

            <button
              type="button"
              onClick={fetchTableData}
              title="Refresh Table Data"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Table Data Viewer */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
            <p className="text-xs uppercase font-semibold font-mono">Scanning {selectedTable}...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <Table className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">Table {selectedTable} is currently empty.</p>
            <p className="text-[11px] text-slate-400">No records have been inserted into this schema partition yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  {columns.map((col) => (
                    <th key={col} className="py-3 px-4 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => handleRowClick(row)}
                    className="hover:bg-indigo-50/20 transition-colors cursor-pointer group"
                  >
                    {columns.map((col) => {
                      const val = row[col];
                      const isNull = val === null || val === undefined;
                      const str = isNull ? 'NULL' : typeof val === 'object' ? JSON.stringify(val) : String(val);

                      return (
                        <td key={col} className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap max-w-xs truncate">
                          {isNull ? (
                            <span className="text-slate-400 italic font-mono text-[10px]">NULL</span>
                          ) : (
                            str
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right">
                      <span className="text-xs font-bold text-indigo-600 group-hover:underline">
                        Inspect &rarr;
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800 font-mono">{rows.length}</strong> of{' '}
            <strong className="text-slate-800 font-mono">{total}</strong> records
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-lg bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AdminDetailModal
        isOpen={Boolean(selectedRowDetail)}
        onClose={() => {
          setSelectedRowDetail(null);
          setSelectedRowRecordId(null);
        }}
        data={selectedRowDetail}
        onDelete={handleDeleteCurrentRow}
        isDeleting={isDeletingRow}
      />
    </div>
  );
};
