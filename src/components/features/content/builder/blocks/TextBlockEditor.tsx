"use client";

import RichTextEditor from "@/components/common/RichTextEditor";
import type { TextBlock, TextBlockTranslation } from "@/components/features/content/content-builder.types";

interface TextBlockEditorProps {
  block: TextBlock;
  onChange: (patch: Partial<TextBlock>) => void;
  /** When set, renders a translated body instead of the English one (the translated title lives in the block card header, not here). */
  translation?: { value: TextBlockTranslation; onChange: (patch: Partial<TextBlockTranslation>) => void };
}

export default function TextBlockEditor({ block, onChange, translation }: TextBlockEditorProps) {
  if (translation) {
    return (
      <RichTextEditor
        content={translation.value.body || ""}
        onChange={(body) => translation.onChange({ body })}
        showColorPicker
        showLineHeight
        hideImageButton={false}
        placeholder="Write the translated content here..."
      />
    );
  }

  return (
    <RichTextEditor
      content={block.content}
      onChange={(content) => onChange({ content })}
      showColorPicker
      showLineHeight
      hideImageButton={false}
      placeholder="Write your content here..."
    />
  );
}
