"use client";

import styles from '@/styles/mentors.module.css';

function Bone({
  w = "100%",
  h = "13px",
  radius = "4px",
}: {
  w?: string;
  h?: string;
  radius?: string;
}) {
  return (
    <div
      className="animate-pulse bg-gray-200"
      style={{ width: w, height: h, borderRadius: radius, flexShrink: 0 }}
    />
  );
}

function MentorRowSkeleton() {
  return (
    <tr>
      <td><Bone w="58px" /></td>
      <td><Bone w="88px" /></td>
      <td><Bone w="120px" /></td>
      <td className={styles.assignedProgramsColumn}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Bone w="20px" />
        </div>
      </td>
      <td><Bone w="160px" /></td>
      <td>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <Bone w="42px" h="11px" />
          <Bone w="44px" h="24px" radius="9999px" />
          <Bone w="36px" h="11px" />
        </div>
      </td>
      <td className={styles.optionsCell}>
        <Bone w="20px" h="20px" radius="50%" />
      </td>
    </tr>
  );
}

export function MentorsSkeleton() {
  return (
    <div className={styles.tableContentArea}>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Mentor ID</th>
              <th>Created On</th>
              <th>Mentor&apos;s Name</th>
              <th className={styles.assignedProgramsColumn}>Assigned Programs</th>
              <th>Email Address</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <MentorRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
