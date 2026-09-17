'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styles from '@/styles/teams.module.css';
import Image from 'next/image';
import TeamMembersModal from '@/components/features/program-admin/TeamMembersModal';
import { ProgramInfoBar } from '@/components/features/program-admin/ProgramInfoBar';
import { useToast } from '@/context/ToastContext';
import { PageLoader } from '@/components/ui/Loader';
import { teamsService } from '@/services/api/teams.service';
import { useProgramId } from '@/hooks/useProgramId';
import * as XLSX from 'xlsx';

interface TeamRow {
    id: number;
    slNo: string;
    name: string;
    size: number;
    engagement: string;
    effectiveness: string;
    rank: number;
    points: number;
    badge: string;
}

const mapTeamRow = (team: any, idx: number): TeamRow => ({
    id: Number(team.team_id ?? team.id ?? idx + 1),
    slNo: String(idx + 1).padStart(2, '0'),
    name: team.team_name || team.name || `Team ${idx + 1}`,
    size: Number(team.team_size ?? team.team_participant_count ?? team.size ?? 0),
    engagement: team.learning_engagement_score !== undefined ? `${team.learning_engagement_score}%` : '0.00%',
    effectiveness: team.learning_effectiveness_score !== undefined ? `${team.learning_effectiveness_score}%` : '0.00%',
    rank: Number(team.rank ?? idx + 1),
    points: Number(team.team_point ?? team.points ?? 0),
    badge: team.badge || '-',
});

export default function TeamsContent() {
    const { showToast } = useToast();
    const { programId, isReady } = useProgramId();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMembersOpen, setViewMembersOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<{ id: number; name: string } | null>(null);

    const { data: teams = [], isLoading: loading } = useQuery({
        queryKey: ['teams', programId],
        queryFn: async () => {
            const res = await teamsService.list(programId!);
            if (!res.success) throw new Error(res.error || 'Failed to fetch teams');
            return (res.data ?? []).map(mapTeamRow);
        },
        enabled: !!programId && isReady,
    });

    const { data: totalParticipants = 0 } = useQuery({
        queryKey: ['team-participant-totals', programId],
        queryFn: async () => {
            const res = await teamsService.listParticipants(programId!);
            // Non-critical: the "Total" badge falls back to 0 if this fails, so no error is thrown here.
            if (!res.success) return 0;
            return Number(res.data?.total_participant ?? 0);
        },
        enabled: !!programId && isReady,
    });

    const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
        queryKey: ['team-members', programId, selectedTeam?.id],
        queryFn: async () => {
            const res = await teamsService.get(programId!, selectedTeam!.id);
            if (!res.success) throw new Error(res.error || 'Failed to fetch team members');
            const teamData = res.data || {};
            return Array.isArray(teamData.participants) ? teamData.participants : [];
        },
        enabled: !!programId && !!selectedTeam?.id && viewMembersOpen,
    });

    const filteredTeams = useMemo(
        () => teams.filter((team) => team.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [teams, searchTerm]
    );

    const handleOpenViewMembers = (team: TeamRow) => {
        setSelectedTeam({ id: team.id, name: team.name });
        setViewMembersOpen(true);
    };

    const handleExport = () => {
        if (!filteredTeams || filteredTeams.length === 0) {
            showToast('No teams available to export', 'info');
            return;
        }

        try {
            const exportData = filteredTeams.map((team) => ({
                'Sl No': team.slNo,
                'Team Name': team.name,
                'Team Size': team.size,
                'Engagement Score': team.engagement,
                'Effectiveness Score': team.effectiveness,
                Rank: team.rank,
                Points: team.points,
                Badge: team.badge,
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Teams');
            XLSX.writeFile(workbook, `Teams_Program_${programId || 'Export'}.xlsx`);
            showToast('Teams exported successfully!', 'success');
        } catch (error) {
            console.error('Export Error:', error);
            showToast('Failed to export teams to Excel', 'error');
        }
    };

    const selectedTeamSize = teams.find((team) => team.id === selectedTeam?.id)?.size ?? 0;

    return (
        <div className={styles.container}>
            {/* Program Info Bar */}
            <Suspense fallback={<PageLoader />}>
                <ProgramInfoBar />
            </Suspense>

            <div className={styles.contentWrapper}>
                <h2 className={styles.pageTitle}>Teams</h2>

                {loading ? (
                    <PageLoader />
                ) : teams.length === 0 ? (
                    <div className={styles.emptyStateCard}>
                        <p className={styles.emptyStateMsg}>
                            No teams have been set up for this program yet — ask your program administrator.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className={styles.controlsRow}>
                            <div className={styles.searchBox}>
                                <input
                                    className={styles.searchInput}
                                    placeholder="Search by Team Name"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button className={styles.searchBtn} type="button">Search</button>
                            </div>
                            <div className={styles.actionButtons}>
                                <button className={styles.exportBtn} onClick={handleExport}>
                                    <Image src="/excel-icon.svg" alt="Excel" width={18} height={18} />
                                    Export
                                </button>
                            </div>
                        </div>

                        <div className={styles.tableCard}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>Sl No</th>
                                        <th>Team Name</th>
                                        <th>Team Size</th>
                                        <th>Engagement Score</th>
                                        <th>Effectiveness Score</th>
                                        <th>Rank</th>
                                        <th>Points</th>
                                        <th>Badge</th>
                                        <th style={{ textAlign: 'right' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTeams.map((team) => (
                                        <tr key={team.id}>
                                            <td style={{ color: '#6B7280' }}>{team.slNo}</td>
                                            <td style={{ fontWeight: '500' }}>{team.name}</td>
                                            <td>{team.size}</td>
                                            <td>{team.engagement}</td>
                                            <td>{team.effectiveness}</td>
                                            <td><b>{team.rank}</b></td>
                                            <td>{team.points}</td>
                                            <td style={{ fontWeight: '500' }}>{team.badge}</td>
                                            <td className={styles.actionCell}>
                                                <span
                                                    className={styles.viewMembers}
                                                    onClick={() => handleOpenViewMembers(team)}
                                                >
                                                    View Members
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <TeamMembersModal
                isOpen={viewMembersOpen}
                onClose={() => setViewMembersOpen(false)}
                teamName={selectedTeam?.name ?? ''}
                totalParticipants={totalParticipants}
                teamSize={selectedTeamSize}
                members={teamMembers}
                loading={membersLoading}
            />
        </div>
    );
}
