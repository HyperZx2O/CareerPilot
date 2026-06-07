import React, { useState } from 'react';
import { uploadCV } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

export default function UploadCV() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const setCvId = useAppStore((state) => state.setCvId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setStatus('Uploading...');
    try {
      const result = await uploadCV(file);
      setCvId(result.cv_id); // Store cvId in localStorage
      setStatus('Uploaded');
    } catch (err) {
      setStatus('Error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input type="file" accept=".pdf,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button type="submit" className="btn-primary">Upload CV</button>
      {status && <p>{status}</p>}
    </form>
  );
}
