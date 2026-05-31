import React from 'react';
import { createApplication } from '@/lib/api';

interface Props {
  job: {
    id: string;
    title: string;
    company: string;
    location?: string;
    fit_score?: number;
  };
}

export default function JobCard({ job }: Props) {
  const handleAdd = async () => {
    try {
      await createApplication({
        user_id: "demo-user-001",
        job_title: job.title,
        company: job.company,
        location: job.location,
        fit_score: job.fit_score,
        job_id: job.id,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="border rounded p-4 shadow-sm">
      <h2 className="text-xl font-semibold">{job.title}</h2>
      <p>{job.company} • {job.location}</p>
      {job.fit_score !== undefined && (
        <p className="font-bold">Fit: {job.fit_score}%</p>
      )}
      <button onClick={handleAdd} className="mt-2 btn-primary">Add to Tracker</button>
    </div>
  );
}
