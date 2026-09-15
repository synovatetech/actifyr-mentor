'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import styles from '@/styles/teams.module.css';
import Image from 'next/image';
import AddTeamModal from '@/components/features/program-admin/AddTeamModal';
import AssignParticipantsModal from '@/components/features/program-admin/AssignParticipantsModal';
import TeamMembersModal from '@/components/features/program-admin/TeamMembersModal';
import ConfirmRemovalModal from '@/components/features/program-admin/ConfirmModal';
import ConfirmCloseModal from '@/components/common/ConfirmCloseModal';
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

interface TeamMemberCount {
    team_id: number;
    team_name: string;
    team_participant_count: number;
}

interface TeamAssignmentParticipant {
    participant_id: number;
    participant_ref_id: string | null;
    name: string;
    team_id: number | null;
    team_name: string | null;
}

interface TeamMember {
    participant_id: number;
    participant_ref_id: string | null;
    name: string;
}

export default function TeamsContent() {
    const { showToast } = useToast();
    const { programId, isReady } = useProgramId();
    const [teams, setTeams] = useState<TeamRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingAssignments, setSavingAssignments] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [activeActionTeamId, setActiveActionTeamId] = useState<number | null>(null);
    const [deleteTeamData, setDeleteTeamData] = useState<{ teamId: number | null; teamName: string; isOpen: boolean }>({
        teamId: null,
        teamName: '',
        isOpen: false,
    });
    const [assignmentData, setAssignmentData] = useState({
        totalParticipants: 0,
        assignedParticipants: 0,
        unassignedParticipants: 0,
        teamStats: [] as TeamMemberCount[],
        participants: [] as TeamAssignmentParticipant[],
    });
    const [modals, setModals] = useState({
        add: false,
        assign: false,
        view: false,
        confirm: false,
        selectedTeam: '',
        selectedTeamId: null as number | null,
    });
    const [confirmData, setConfirmData] = useState({ studentId: null as number | null, studentName: '' });

    const fetchTeams = async () => {
        if (!programId) return;
        setLoading(true);
        try {
            const res = await teamsService.list(programId);
            if (res.success) {
                setTeams(res.data.map((team: any, idx: number) => ({
                    id: Number(team.team_id ?? team.id ?? idx + 1),
                    slNo: String(idx + 1).padStart(2, '0'),
                    name: team.team_name || team.name || `Team ${idx + 1}`,
                    size: Number(team.team_size ?? team.team_participant_count ?? team.size ?? 0),
                    engagement: team.learning_engagement_score !== undefined ? `${team.learning_engagement_score}%` : '0.00%',
                    effectiveness: team.learning_effectiveness_score !== undefined ? `${team.learning_effectiveness_score}%` : '0.00%',
                    rank: Number(team.rank ?? idx + 1),
                    points: Number(team.team_point ?? team.points ?? 0),
                    badge: team.badge || '-',
                })));
            } else {
                showToast(res.error || 'Failed to fetch teams', 'error');
            }
        } catch (err) {
            showToast('An error occurred while fetching teams', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignmentData = async () => {
        if (!programId) return;
        try {
            const res = await teamsService.listParticipants(programId);
            if (res.success) {
                const data = res.data || {};
                setAssignmentData({
                    totalParticipants: Number(data.total_participant ?? 0),
                    assignedParticipants: Number(data.total_participant_assigned ?? 0),
                    unassignedParticipants: Number(data.total_participant_unassigned ?? 0),
                    teamStats: Array.isArray(data.team_member_count) ? data.team_member_count : [],
                    participants: Array.isArray(data.participants) ? data.participants : [],
                });
                return;
            }
            showToast(res.error || 'Failed to fetch participants', 'error');
        } catch (err) {
            showToast('An error occurred while fetching participants', 'error');
        }
    };

    const fetchTeamMembers = async (teamId: number) => {
        if (!programId) return;
        try {
            const res = await teamsService.get(programId, teamId);
            if (res.success) {
                const teamData = res.data || {};
                setTeamMembers(Array.isArray(teamData.participants) ? teamData.participants : []);
                return;
            }
            showToast(res.error || 'Failed to fetch team members', 'error');
        } catch (err) {
            showToast('An error occurred while fetching team members', 'error');
        }
    };

    useEffect(() => {
        if (isReady && programId) {
            fetchTeams();
        }
    }, [isReady, programId]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Element | null;
            if (target?.closest(`.${styles.menuWrapper}`)) {
                return;
            }
            setActiveActionTeamId(null);
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, []);

    const filteredTeams = useMemo(
        () => teams.filter((team) => team.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [teams, searchTerm]
    );

    const handleCreateTeam = async (data: any) => {
        if (!programId) return;
        try {
            const res = await teamsService.create(programId, { team_name: data.name });
            if (res.success) {
                showToast('Team created successfully', 'success');
                fetchTeams();
                setModals((prev) => ({ ...prev, add: false }));
            } else {
                showToast(res.error || 'Failed to create team', 'error');
            }
        } catch (err) {
            showToast('An error occurred while creating team', 'error');
        }
    };

    const handleAssignParticipants = async (assignments: { participant_id: number; team_id: number }[]) => {
        if (!programId) return;
        setSavingAssignments(true);
        try {
            const res = await teamsService.assignParticipants(programId, assignments);
            if (res.success) {
                showToast('Participants assigned successfully', 'success');
                setModals((prev) => ({ ...prev, assign: false }));
                await Promise.all([fetchTeams(), fetchAssignmentData()]);
            } else {
                showToast(res.error || 'Failed to assign participants', 'error');
            }
        } catch (err) {
            showToast('An error occurred while assigning participants', 'error');
        } finally {
            setSavingAssignments(false);
        }
    };

    const handleOpenAssignModal = async () => {
        if (!programId) return;
        await fetchAssignmentData();
        setModals((prev) => ({ ...prev, assign: true }));
    };

    const handleOpenViewMembers = async (team: TeamRow) => {
        setTeamMembers([]);
        await fetchTeamMembers(team.id);
        setModals((prev) => ({
            ...prev,
            view: true,
            selectedTeam: team.name,
            selectedTeamId: team.id,
        }));
    };

    const handleRemoveMember = async () => {
        if (!programId || !modals.selectedTeamId || !confirmData.studentId) return;
        try {
            const res = await teamsService.removeParticipant(programId, modals.selectedTeamId, confirmData.studentId);
            if (res.success) {
                showToast('Member removed successfully', 'success');
                await Promise.all([fetchTeams(), fetchAssignmentData(), fetchTeamMembers(modals.selectedTeamId)]);
                setModals((prev) => ({ ...prev, confirm: false, view: true }));
            } else {
                showToast(res.error || 'Failed to remove member', 'error');
            }
        } catch (err) {
            showToast('An error occurred while removing member', 'error');
        }
    };

    const handleDeleteTeam = async (teamId: number, teamName: string) => {
        if (!programId) return;

        try {
            const res = await teamsService.deleteTeam(programId, teamId);
            if (res.success) {
                showToast('Team deleted successfully', 'success');
                fetchTeams();
                setDeleteTeamData({ teamId: null, teamName: '', isOpen: false });
            } else {
                showToast(res.error || 'Failed to delete team', 'error');
            }
        } catch (err) {
            showToast('An error occurred while deleting team', 'error');
        }
    };

    const handleOpenDeleteConfirm = (team: TeamRow) => {
        setDeleteTeamData({
            teamId: team.id,
            teamName: team.name,
            isOpen: true,
        });
        setActiveActionTeamId(null);
    };

    const handleConfirmDeleteTeam = async () => {
        if (!deleteTeamData.teamId) return;
        await handleDeleteTeam(deleteTeamData.teamId, deleteTeamData.teamName);
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

    const selectedTeamSize = teams.find((team) => team.id === modals.selectedTeamId)?.size ?? 0;

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
                            Organize participants into teams to boost collaboration and introduce team-based rankings on the leaderboard
                        </p>
                        <button
                            className={styles.createButton}
                            onClick={() => setModals((prev) => ({ ...prev, add: true }))}
                        >
                            Create Team
                        </button>
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
                                <button
                                    className={styles.secondaryBtn}
                                    onClick={() => setModals((prev) => ({ ...prev, add: true }))}
                                >
                                    Add Team
                                </button>
                                <button
                                    className={styles.secondaryBtn}
                                    onClick={handleOpenAssignModal}
                                >
                                    Assign Participants
                                </button>
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
                                                <div
                                                    className={styles.menuWrapper}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        type="button"
                                                        className={styles.moreBtn}
                                                        onClick={() => setActiveActionTeamId((prev) => (prev === team.id ? null : team.id))}
                                                    >
                                                        ⋮
                                                    </button>
                                                    {activeActionTeamId === team.id && (
                                                        <div className={styles.actionDropdown}>
                                                            <button
                                                                type="button"
                                                                className={styles.actionDropdownItem}
                                                                onClick={() => handleOpenDeleteConfirm(team)}
                                                            >
                                                                Delete Team
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
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
            <AddTeamModal
                isOpen={modals.add}
                onClose={() => setModals((prev) => ({ ...prev, add: false }))}
                onSave={handleCreateTeam}
            />

            <AssignParticipantsModal
                isOpen={modals.assign}
                onClose={() => setModals((prev) => ({ ...prev, assign: false }))}
                totalParticipants={assignmentData.totalParticipants}
                assignedParticipants={assignmentData.assignedParticipants}
                unassignedParticipants={assignmentData.unassignedParticipants}
                teamStats={assignmentData.teamStats}
                participants={assignmentData.participants}
                onSave={handleAssignParticipants}
                saving={savingAssignments}
            />

            <TeamMembersModal
                isOpen={modals.view}
                onClose={() => setModals((prev) => ({ ...prev, view: false }))}
                teamName={modals.selectedTeam}
                totalParticipants={assignmentData.totalParticipants}
                teamSize={selectedTeamSize}
                members={teamMembers}
                onRemove={(participantId, participantName) => {
                    setConfirmData({ studentId: participantId, studentName: participantName });
                    setModals((prev) => ({ ...prev, view: false, confirm: true }));
                }}
            />

            <ConfirmRemovalModal
                isOpen={modals.confirm}
                onClose={() => setModals((prev) => ({ ...prev, confirm: false, view: true }))}
                onConfirm={handleRemoveMember}
                studentName={confirmData.studentName}
                teamName={modals.selectedTeam}
            />

            {deleteTeamData.isOpen && (
                <ConfirmCloseModal
                    title="Delete Team"
                    message={`Are you sure you want to delete ${deleteTeamData.teamName}? This action cannot be undone.`}
                    confirmText="Delete Team"
                    cancelText="Cancel"
                    showDeleteIcon
                    onCancel={() => setDeleteTeamData({ teamId: null, teamName: '', isOpen: false })}
                    onConfirm={handleConfirmDeleteTeam}
                />
            )}
        </div>
    );
}
