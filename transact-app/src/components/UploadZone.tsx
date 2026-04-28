import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  loading: boolean;
}

export default function UploadZone({ onFiles, loading }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.name.toLowerCase().endsWith('.csv'));
    if (files.length) onFiles(files);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length) onFiles(files);
    e.target.value = '';
  }

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".csv" multiple className="hidden" onChange={handleChange} />
      <div className="text-4xl mb-3">📂</div>
      {loading ? (
        <p className="text-slate-500">Parsing transactions…</p>
      ) : (
        <>
          <p className="text-slate-700 font-medium text-lg">Drop CSV files here or click to browse</p>
          <p className="text-slate-400 text-sm mt-1">Supports Chase, Amex, Citi, Capital One</p>
        </>
      )}
    </div>
  );
}
