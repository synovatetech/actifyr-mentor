"use client";

import React from "react";
import styles from "@/styles/goals-habits.module.css";
import type { GoalHabitRow } from "@/components/features/program-admin/GoalHabitTable.types";

interface GoalsTableProps {
  data: GoalHabitRow[];
  onViewDetails: (item: GoalHabitRow) => void;
}

export default function GoalsTable({ data, onViewDetails }: GoalsTableProps) {
  const shouldHighlightRow = (status?: GoalHabitRow["status"]) =>
    status === "New" || status === "Updated";

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th style={{ width: "25%" }}>User Name</th>
          <th style={{ width: "45%" }}>Goal Title</th>
          <th style={{ width: "12%" }}>Status</th>
          <th style={{ width: "12%" }}>Progress</th>
          <th style={{ width: "6%" }} />
        </tr>
      </thead>
      <tbody>
        {data.length > 0 ? (
          data.map((item) => (
            <tr
              key={item.id}
              className={`${styles.tableRow} ${shouldHighlightRow(item.status) ? styles.rowHighlight : ""}`}
              onClick={() => onViewDetails(item)}
            >
              <td style={{ fontWeight: 500 }}>{item.name}</td>
              <td>{item.title}</td>
              <td>
                {item.status && (
                  <span className={styles[`status${item.status}`]}>
                    {item.status}
                  </span>
                )}
              </td>
              <td>{item.progress || "-"}</td>
              <td className={styles.arrowCell}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
              No goals found for this program.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
