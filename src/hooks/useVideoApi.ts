"use client";

import { useQuery } from "@tanstack/react-query";
import { aiService } from "@/services/api/ai.service";

export interface AvatarGroup {
  group_id: string;
  name: string;
  preview_image_url: string;
  preview_video_url: string;
}

export interface AvatarItem {
  id: string;
  name: string;
  image_url: string;
  video_url: string;
}

export interface Voice {
  voice_id: string;
  name: string;
  language: string;
  gender: string;
  preview_audio_url: string;
}

export interface AudioVoice {
  name: string;
  gender: string;
}

export const VIDEO_QUERY_KEYS = {
  avatarGroups: ["video", "avatar-groups"] as const,
  avatarList: (groupId: string, token?: string) =>
    ["video", "avatar-list", groupId, token ?? ""] as const,
  voices: ["video", "voices"] as const,
  audioVoices: ["audio", "voices"] as const,
};

export function useAvatarGroups() {
  return useQuery({
    queryKey: VIDEO_QUERY_KEYS.avatarGroups,
    queryFn: async () => {
      const res = await aiService.getAvatarGroups();
      if (!res.success)
        throw new Error(res.error || "Failed to fetch avatar groups");
      return res.data as {
        items: AvatarGroup[];
        has_next: boolean;
        next_token: string | null;
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAvatarList(groupId: string | null, token?: string) {
  return useQuery({
    queryKey: VIDEO_QUERY_KEYS.avatarList(groupId ?? "", token),
    queryFn: async () => {
      if (!groupId) throw new Error("Group ID required");
      const res = await aiService.getAvatarList(groupId, token);
      if (!res.success)
        throw new Error(res.error || "Failed to fetch avatars");
      return res.data as {
        items: AvatarItem[];
        has_next: boolean;
        next_token: string | null;
      };
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useVoices() {
  return useQuery({
    queryKey: VIDEO_QUERY_KEYS.voices,
    queryFn: async () => {
      const res = await aiService.getVoices();
      if (!res.success) throw new Error(res.error || "Failed to fetch voices");
      return res.data as {
        items: Voice[];
        has_next: boolean;
        next_token: string | null;
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAudioVoices() {
  return useQuery({
    queryKey: VIDEO_QUERY_KEYS.audioVoices,
    queryFn: async () => {
      const res = await aiService.getAudioVoices();
      if (!res.success) throw new Error(res.error || "Failed to fetch audio voices");
      return res.data as {
        items: AudioVoice[];
        has_next: boolean;
        next_token: string | null;
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
