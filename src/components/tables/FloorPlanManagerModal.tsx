import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  LayoutGrid,
  List,
  Check,
  AlertCircle,
  Users,
  Move,
  Layers,
} from 'lucide-react';
import { localRepository } from '../../services/localRepository';
import { DiningSection, DiningTable } from '../../types';

interface FloorPlanManagerModalProps {
  outletId: string;
  isOpen: boolean;
  onClose: () => void;
  onLayoutSaved: () => void;
  addToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const FloorPlanManagerModal: React.FC<FloorPlanManagerModalProps> = ({
  outletId,
  isOpen,
  onClose,
  onLayoutSaved,
  addToast,
}) => {
  const [sections, setSections] = useState<DiningSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [editorMode, setEditorMode] = useState<'canvas' | 'list'>('canvas');

  // Adding / Editing Area
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Adding / Editing Table
  const [editingTable, setEditingTable] = useState<Partial<DiningTable> | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);

  // Dragging state on canvas
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      let [secs, tbls] = await Promise.all([
        localRepository.getDiningSections(outletId),
        localRepository.getTables(outletId),
      ]);
      // If no dining areas exist yet, create a default "Main Dining" area so tables can be added seamlessly
      if (secs.length === 0) {
        const defaultSec = await localRepository.saveDiningSection({
          name: newSectionName.trim() || 'Main Dining',
          outletId,
        });
        secs = [defaultSec];
      }
      setSections(secs);
      setActiveSectionId((prev) => {
        if (prev && secs.some((s) => s.id === prev)) return prev;
        return secs[0]?.id || '';
      });
      setTables(tbls);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      addToast(err.message || 'Failed to load floor plan data', 'error');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, outletId]);

  if (!isOpen) return null;

  const currentSection = sections.find((s) => s.id === activeSectionId) || sections[0];
  const sectionTables = tables.filter(
    (t) =>
      (!currentSection) ||
      t.section === currentSection?.name ||
      t.sectionId === currentSection?.id
  );

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    try {
      const created = await localRepository.saveDiningSection({
        name: newSectionName.trim(),
        outletId,
      });
      setSections((prev) => [...prev, created]);
      setActiveSectionId(created.id);
      setNewSectionName('');
      setIsAddingSection(false);
      addToast(`Created dining area: ${created.name}`, 'success');
      return created;
    } catch (err: any) {
      addToast(err.message || 'Failed to create dining area', 'error');
      return null;
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this dining area?')) return;
    try {
      await localRepository.deleteDiningSection(sectionId);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      if (activeSectionId === sectionId) {
        const remaining = sections.filter((s) => s.id !== sectionId);
        setActiveSectionId(remaining[0]?.id || '');
      }
      addToast('Dining area removed', 'info');
    } catch (err: any) {
      addToast(err.message || 'Failed to delete dining area', 'error');
    }
  };

  const handleSaveTable = async () => {
    if (!editingTable || !editingTable.tableNumber?.trim()) {
      addToast('Table number is required', 'warning');
      return;
    }

    try {
      let targetSection =
        sections.find((s) => s.id === (editingTable.sectionId || activeSectionId)) ||
        currentSection;

      // If no section exists yet, or current section is missing:
      if (!targetSection) {
        const areaName = newSectionName.trim() || 'Main Dining';
        const created = await localRepository.saveDiningSection({
          name: areaName,
          outletId,
        });
        setSections((prev) => [...prev, created]);
        setActiveSectionId(created.id);
        setIsAddingSection(false);
        setNewSectionName('');
        targetSection = created;
      }

      const saved = await localRepository.saveTable({
        ...editingTable,
        tableNumber: editingTable.tableNumber.trim().toUpperCase(),
        outletId,
        section: targetSection.name,
        sectionId: targetSection.id,
        seatingCapacity: Number(editingTable.seatingCapacity) || 4,
        shape: editingTable.shape || 'square',
      } as any);

      setTables((prev) => {
        const idx = prev.findIndex(
          (t) => t.id === saved.id || (editingTable.id && t.id === editingTable.id) || t.tableNumber === saved.tableNumber
        );
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev, saved];
      });

      setIsTableModalOpen(false);
      setEditingTable(null);
      addToast(`Table ${saved.tableNumber} saved successfully`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to save table', 'error');
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;
    try {
      await localRepository.deleteTable(tableId);
      setTables((prev) => prev.filter((t) => t.id !== tableId));
      addToast('Table removed', 'info');
    } catch (err: any) {
      addToast(err.message || 'Cannot delete table', 'error');
    }
  };

  // Canvas Drag & Drop handlers
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedTableId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(rect.width - 90, e.clientX - rect.left - 40));
    const y = Math.max(10, Math.min(rect.height - 90, e.clientY - rect.top - 40));

    setTables((prev) =>
      prev.map((t) => (t.id === draggedTableId ? { ...t, posX: Math.round(x), posY: Math.round(y) } : t))
    );
    setHasUnsavedChanges(true);
  };

  const handleCanvasMouseUp = () => {
    setDraggedTableId(null);
  };

  const handleSaveLayout = async () => {
    try {
      const layoutData = tables.map((t) => ({
        id: t.id,
        posX: t.posX ?? 50,
        posY: t.posY ?? 50,
        shape: t.shape || 'square',
      }));
      await localRepository.saveTableLayout(layoutData);
      setHasUnsavedChanges(false);
      onLayoutSaved();
      addToast('Floor plan layout saved successfully', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to save layout', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-[#121824] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Floor Plan & Table Manager</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Design dining areas, configure seating capacities, and arrange visual table positioning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold mr-2">
              <button
                onClick={() => setEditorMode('canvas')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  editorMode === 'canvas'
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Visual Canvas</span>
              </button>
              <button
                onClick={() => setEditorMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  editorMode === 'list'
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List Editor</span>
              </button>
            </div>

            {hasUnsavedChanges && (
              <button
                onClick={handleSaveLayout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Layout</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dining Area Selector Tabs */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto">
            {sections.map((sec) => (
              <div key={sec.id} className="flex items-center group relative">
                <button
                  onClick={() => setActiveSectionId(sec.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeSectionId === sec.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {sec.name}
                </button>
                {sections.length > 1 && (
                  <button
                    onClick={() => handleDeleteSection(sec.id)}
                    className="ml-1 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`Delete ${sec.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {isAddingSection ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Area Name (e.g. Rooftop)"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                  className="px-2.5 py-1 text-xs rounded-lg border border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleAddSection}
                  className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsAddingSection(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingSection(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Dining Area</span>
              </button>
            )}
          </div>

          <button
            onClick={() => {
              const defaultSec = currentSection || sections[0];
              setEditingTable({
                tableNumber: `T${tables.length + 1}`,
                seatingCapacity: 4,
                shape: 'square',
                sectionId: defaultSec?.id,
                section: defaultSec?.name,
                posX: 50,
                posY: 50,
              });
              setIsTableModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Table</span>
          </button>
        </div>

        {/* Content View: Visual Canvas or List */}
        <div className="flex-1 overflow-hidden relative">
          {editorMode === 'canvas' ? (
            <div
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className="w-full h-full bg-slate-100/60 dark:bg-[#0B0F17] relative overflow-hidden select-none cursor-crosshair"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(148, 163, 184, 0.25) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            >
              <div className="absolute top-3 left-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                Dining Area: <span className="font-bold text-slate-700 dark:text-slate-200">{currentSection?.name || 'Main Area'}</span> • Drag any table to reposition
              </div>

              {sectionTables.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <p className="font-bold text-sm">No tables in {currentSection?.name || 'this area'}</p>
                  <p className="text-xs mt-1">Click "Add Table" to place your first table on the floor plan.</p>
                </div>
              ) : (
                sectionTables.map((table) => {
                  const x = table.posX ?? 60;
                  const y = table.posY ?? 60;
                  const isRound = table.shape === 'round';
                  const isRectangle = table.shape === 'rectangle';

                  return (
                    <div
                      key={table.id}
                      onMouseDown={() => setDraggedTableId(table.id)}
                      style={{ left: `${x}px`, top: `${y}px` }}
                      className={`absolute cursor-grab active:cursor-grabbing transition-shadow flex flex-col items-center justify-center border-2 shadow-md group ${
                        isRound
                          ? 'w-20 h-20 rounded-full'
                          : isRectangle
                          ? 'w-28 h-18 rounded-2xl'
                          : 'w-20 h-20 rounded-2xl'
                      } ${
                        table.status === 'occupied'
                          ? 'bg-blue-50/90 dark:bg-blue-950/70 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                          : 'bg-white dark:bg-[#1a2333] border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:border-blue-500'
                      }`}
                    >
                      <span className="font-black text-sm">{table.tableNumber}</span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" />
                        {table.seatingCapacity}p
                      </span>

                      {/* Hover action bar */}
                      <div className="absolute -top-3 right-0 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTable(table);
                            setIsTableModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600"
                          title="Edit Table"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTable(table.id);
                          }}
                          className="p-1 text-slate-500 hover:text-red-500"
                          title="Delete Table"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="p-6 h-full overflow-y-auto">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Table</th>
                      <th className="p-3">Area</th>
                      <th className="p-3">Capacity</th>
                      <th className="p-3">Shape</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {sectionTables.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-extrabold text-slate-900 dark:text-white">{t.tableNumber}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{t.section}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{t.seatingCapacity} Guests</td>
                        <td className="p-3 capitalize text-slate-600 dark:text-slate-300">{t.shape || 'Square'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'available'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingTable(t);
                              setIsTableModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTable(t.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            Total Tables: <strong className="text-slate-900 dark:text-white">{tables.length}</strong> ({sectionTables.length} in this area)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSaveLayout}
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Table Modal */}
      {isTableModalOpen && editingTable && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#121824] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingTable.id ? 'Edit Table' : 'Add New Table'}
              </h3>
              <button
                onClick={() => {
                  setIsTableModalOpen(false);
                  setEditingTable(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold">
              <div>
                <label className="text-slate-500 block mb-1">Table Number / Label</label>
                <input
                  type="text"
                  placeholder="e.g. T1, T2, VIP-1"
                  value={editingTable.tableNumber || ''}
                  onChange={(e) => setEditingTable({ ...editingTable, tableNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {sections.length > 0 && (
                <div>
                  <label className="text-slate-500 block mb-1">Dining Area</label>
                  <select
                    value={editingTable.sectionId || activeSectionId || sections[0]?.id}
                    onChange={(e) => {
                      const sec = sections.find((s) => s.id === e.target.value);
                      if (sec) {
                        setEditingTable({ ...editingTable, sectionId: sec.id, section: sec.name });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 text-xs"
                  >
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sections.length === 0 && (
                <div>
                  <label className="text-slate-500 block mb-1">Dining Area Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ground Floor, Main Dining"
                    value={newSectionName || ''}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-500 block mb-1">Seating Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={editingTable.seatingCapacity || 4}
                  onChange={(e) => setEditingTable({ ...editingTable, seatingCapacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Table Shape</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['square', 'round', 'rectangle'] as const).map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => setEditingTable({ ...editingTable, shape })}
                      className={`py-2 px-3 rounded-xl border text-center capitalize font-bold transition-all ${
                        editingTable.shape === shape
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsTableModalOpen(false);
                  setEditingTable(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTable}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
              >
                Save Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
