'use client';

import React from 'react';
import styles from '@/styles/reports.module.css';

export default function IndividualReportTab() {
  return (
    <div className={styles.inlineHeaderSection}>
      <h3 className={styles.sectionTitle}>Generate Report for Individuals</h3>
      <div className={styles.criteriaGrid}>
        <div className={styles.criteriaItem}>
          <label className={styles.inputLabel}>Select Task Date</label>
          <div className={styles.dateWrapper}>
            <input className={styles.dateInput} placeholder="DD MMM YYYY" readOnly />
          </div>
        </div>
        <div className={styles.criteriaItem}>
          <label className={styles.inputLabel}>Choose Participants</label>
          <div className={styles.selectWrapper}>
            <select className={styles.select}>
              <option>Select</option>
            </select>
          </div>
        </div>
        <div className={styles.criteriaItem}>
          <label className={styles.inputLabel}>Task Status</label>
          <div className={styles.selectWrapper}>
            <select className={styles.select}>
              <option>Select</option>
            </select>
          </div>
        </div>
        <button className={styles.generateBtn} style={{ padding: '12px 32px' }}>
          Generate Report
        </button>
      </div>
    </div>
  );
}
