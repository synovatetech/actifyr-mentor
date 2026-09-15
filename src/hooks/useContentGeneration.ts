"use client";

import { useMutation } from "@tanstack/react-query";
import { aiService } from "@/services/api/ai.service";

export interface GenerateAudioInput {
  program_content_id: number | string;
  audio_script?: string;
  voice_name?: string;
}

export interface GenerateVideoInput {
  program_content_id: number | string;
  video_script?: string;
}

export interface GenerateVideoWithAvatarInput {
  program_content_id: number | string;
  avatar_id: string;
  voice_id: string;
  program_id: number | string;
  video_script?: string;
}

export interface RegenerateContentInput {
  program_content_id: number | string;
  feedback: string;
}

export function useGenerateAudio() {
  return useMutation({
    mutationFn: (data: GenerateAudioInput) => aiService.generateAudio(data),
  });
}

export function useGenerateVideo() {
  return useMutation({
    mutationFn: (data: GenerateVideoInput) => aiService.generateVideo(data),
  });
}

export function useGenerateVideoWithAvatar() {
  return useMutation({
    mutationFn: (data: GenerateVideoWithAvatarInput) =>
      aiService.generateVideoWithAvatar(data),
  });
}

export function useRegenerateContent() {
  return useMutation({
    mutationFn: (data: RegenerateContentInput) =>
      aiService.generateDaywiseContent(data),
  });
}
