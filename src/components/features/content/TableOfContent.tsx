"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/ai-content.module.css";
import { aiService } from "@/services/api/ai.service";
import { toast } from "react-hot-toast";

interface TOCItem {
  id: number;
  day_number: number;
  day: string;
  date: string;
  time: string;
  topic: string;
  objective: string;
  description: string;
}

interface TableOfContentProps {
  onGenerate: () => void;
  programConfigId: number | null;
  initialItems: TOCItem[];
}

export function TableOfContent({
  onGenerate,
  programConfigId,
  initialItems,
}: TableOfContentProps) {
  const [tocItems, setTocItems] = useState<TOCItem[]>(initialItems || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TOCItem | null>(null);

  // Form states for edit
  const [editedTopic, setEditedTopic] = useState("");
  const [editedObjective, setEditedObjective] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setTocItems(initialItems);
    }
  }, [initialItems]);

  const handleEditClick = (item: TOCItem) => {
    setSelectedItem(item);
    setEditedTopic(item.topic);
    setEditedObjective(item.objective);
    setEditedDescription(item.description);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    if (programConfigId && selectedItem.id) {
      setIsSaving(true);
      try {
        const updatedData = {
          topic: editedTopic,
          objective: editedObjective,
          description: editedDescription,
        };
        const response = await aiService.updateTocItem(
          programConfigId,
          selectedItem.id,
          updatedData,
        );
        if (response.success) {
          toast.success("Updated successfully");
          const updatedItems = tocItems.map((item) =>
            item.id === selectedItem.id
              ? {
                  ...item,
                  topic: editedTopic,
                  objective: editedObjective,
                  description: editedDescription,
                }
              : item,
          );
          setTocItems(updatedItems);
          setIsModalOpen(false);
        } else {
          toast.error(response.error || "Failed to update");
        }
      } catch (error) {
        console.error(error);
        toast.error("An error occurred");
      } finally {
        setIsSaving(false);
      }
    } else {
      // Local fallback
      const updatedItems = tocItems.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              topic: editedTopic,
              objective: editedObjective,
              description: editedDescription,
            }
          : item,
      );
      setTocItems(updatedItems);
      setIsModalOpen(false);
    }
  };

  return (
    <div className={styles.tocContentBox}>
      <div className={styles.tocHeaderArea}>
        <h2 className={styles.tocTitleRed}>Review Table of Content</h2>
      </div>

      <div className={styles.tocListArea}>
        {tocItems.map((item, index) => (
          <div key={item.id} className={styles.tocTimelineItem}>
            <div className={styles.tocTimelineLeft}>
              <div className={styles.timelineConnector} />
              <span className={styles.timelineDay}>{item.day}</span>
              <span className={styles.timelineDate}>{item.date}</span>
              <span className={styles.timelineTime}>{item.time}</span>
            </div>

            <div className={styles.tocCard}>
              <div className={styles.tocCardHeader}>
                <h3 className={styles.tocCardTitle}>
                  <span>#{item.day_number}</span> {item.topic}
                </h3>
                <div
                  className={styles.editIconBox}
                  onClick={() => handleEditClick(item)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9.33333 1.75L12.25 4.66667M10.7917 0.583333C11.1783 0.196658 11.7029 0 12.25 0C12.7971 0 13.3217 0.196658 13.7083 0.583333C14.095 0.969992 14.2917 1.49457 14.2917 2.04167C14.2917 2.58877 14.095 3.11334 13.7083 3.5L3.79167 13.4167H0.875V10.5L10.7917 0.583333Z"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <div className={styles.tocCardBody}>
                <div className={styles.tocInfoRow}>
                  <span className={styles.infoLabel}>Objective:</span>
                  <span className={styles.infoText}>{item.objective}</span>
                </div>
                <div className={styles.tocInfoRow}>
                  <span className={styles.infoLabel}>Description:</span>
                  <span className={styles.infoText}>{item.description}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tocFooterArea}>
        <button className={styles.generateLargeButton} onClick={onGenerate}>
          Generate Full Content
        </button>
      </div>

      {/* Edit Modal - rendered via Portal to escape parent stacking context */}
      {isModalOpen &&
        selectedItem &&
        createPortal(
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalBody}>
                <h2 className={styles.modalTitleRed}>ToC #{selectedItem.id}</h2>
                <p className={styles.modalSchedule}>
                  Content Schedule{" "}
                  <b>
                    {selectedItem.day}, {selectedItem.date}, {selectedItem.time}
                  </b>
                </p>

                <div className={styles.modalInputGroup}>
                  <label>Topic</label>
                  <textarea
                    className={styles.modalTextarea}
                    style={{ height: "70px" }}
                    value={editedTopic}
                    onChange={(e) => setEditedTopic(e.target.value)}
                  />
                </div>

                <div className={styles.modalInputGroup}>
                  <label>Objective</label>
                  <textarea
                    className={styles.modalTextarea}
                    style={{ height: "80px" }}
                    value={editedObjective}
                    onChange={(e) => setEditedObjective(e.target.value)}
                  />
                </div>

                <div className={styles.modalInputGroup}>
                  <label>Description</label>
                  <textarea
                    className={styles.modalTextarea}
                    style={{ height: "100px" }}
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                  />
                </div>

                <div className={styles.modalFooter}>
                  <button
                    className={styles.modalCloseBtn}
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSaving}
                  >
                    Close
                  </button>
                  <button
                    className={styles.modalSaveBtn}
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
