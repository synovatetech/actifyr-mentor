export interface MediaItem {
    id: string | number;
    file?: File;
    previewUrl?: string;
    type: 'video' | 'audio';
    name?: string;
    path?: string;
    thumbnail_path?: string;
    duration?: number;
}

/** Shape of a single daywise content item returned by the API. */
export interface DaywiseContentItem {
    id: number;
    content_id?: number;
    table_of_content_id?: number;
    day_number?: number;
    program_date?: string;
    title?: string;
    introduction?: string | null;
    video_script?: string | null;
    audio_script?: string | null;
    /** Non-null when a video job has been started. */
    video_id?: string | null;
    video_status?: string | null;
    /** AI-generated media links (audio/video) attached to this content. */
    ai_media_files_links?: Array<{
        url?: string;
        file_path?: string;
        path?: string;
        type?: 'video' | 'audio';
        title?: string | null;
        playback_url?: string;
        playbackUrl?: string;
        thumbnail_url?: string;
        thumbnailUrl?: string;
    }> | null;
    actions?: string | null;
    action_tasks?: Array<{
        task_name?: string;
        task_description?: string;
    }> | null;
    mcqs?: Array<{
        id?: number;
        question: string;
        options: string[];
        correct_answer: number | string;
    }> | null;
    resources?: {
        label?: string;
        url: string;
    } | Array<Record<string, unknown>> | string | null;
    tasks?: Array<Record<string, unknown>> | null;
    questionnaires?: Array<Record<string, unknown>> | null;
    is_ai_generated?: boolean;
    review_status?: string | null;
    status?: string | null;
    /** UTC datetime or time string from the API. */
    date?: string | null;
    time?: string | null;
    meet_time?: string | null;
    meet_available?: boolean | string;
    meet_link?: string | null;
    meeting_link?: string | null;
    link_to_previous_content?: boolean | string;
    content?: string | null;
    unlock_date?: string | null;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}
