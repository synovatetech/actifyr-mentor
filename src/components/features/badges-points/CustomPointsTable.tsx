"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "@/styles/badges-points.module.css";

export interface CustomPointRow {
  id: string;
  title: string;
  description: string;
  max_point: number;
}

interface CustomPointsTableProps {
  items: CustomPointRow[];
  onEdit: (item: CustomPointRow) => void;
  onDelete: (item: CustomPointRow) => void;
}

export default function CustomPointsTable({
  items,
  onEdit,
  onDelete,
}: CustomPointsTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: "70px" }}>ID</th>
            <th>Title</th>
            <th>Description</th>
            <th style={{ width: "140px" }}>Max Points</th>
            <th style={{ width: "64px" }} />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                No custom points configured yet.
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td style={{ fontWeight: 500 }}>{item.title}</td>
                <td>
                  <div className={styles.customPointDescription} title={item.description}>
                    {item.description}
                  </div>
                </td>
                <td>{item.max_point}</td>
                <td style={{ position: "relative", textAlign: "center" }}>
                  <div
                    className={styles.actionBtn}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId((prev) => (prev === item.id ? null : item.id));
                    }}
                    style={{ display: "inline-flex", padding: "8px" }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 8C13.1046 8 14 7.10457 14 6C14 4.89543 13.1046 4 12 4C10.8954 4 10 4.89543 10 6C10 7.10457 10.8954 8 12 8ZM12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14ZM14 18C14 19.1046 13.1046 20 12 20C10.8954 20 10 19.1046 10 18C10 16.8954 10.8954 16 12 16C13.1046 16 14 16.8954 14 18Z"
                        fill="#9CA3AF"
                      />
                    </svg>
                    {openMenuId === item.id && (
                      <div
                        className={styles.dropdownMenu}
                        ref={menuRef}
                        style={{ right: "16px", top: "36px" }}
                      >
                        <div
                          className={styles.dropdownItem}
                          onClick={() => {
                            onEdit(item);
                            setOpenMenuId(null);
                          }}
                        >
                          Edit
                        </div>
                        <div
                          className={styles.dropdownItem}
                          onClick={() => {
                            onDelete(item);
                            setOpenMenuId(null);
                          }}
                        >
                          Delete
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
