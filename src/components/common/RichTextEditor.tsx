"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import styles from "@/styles/editor.module.css";

// ---------------------------------------------------------------------------
// FontSize extension — uses TextStyle mark to apply inline font-size
// ---------------------------------------------------------------------------
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});

// ---------------------------------------------------------------------------
// LineHeight extension — stores line-height as an inline style directly on
// each paragraph/heading node, so it's baked into the saved HTML itself and
// renders identically everywhere that HTML is displayed (this editor, the
// tiptap-rendered-content previews, mobile), with no separate wrapper/format
// to keep in sync.
// ---------------------------------------------------------------------------
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

const DEFAULT_LINE_HEIGHT = "1.5";

const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() {
    return { types: ["heading", "paragraph"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: DEFAULT_LINE_HEIGHT,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }) =>
          this.options.types
            .map((type: string) => commands.updateAttributes(type, { lineHeight }))
            .some((response: boolean) => response),
      unsetLineHeight:
        () =>
        ({ commands }) =>
          this.options.types
            .map((type: string) => commands.updateAttributes(type, { lineHeight: null }))
            .some((response: boolean) => response),
    };
  },
});

// ---------------------------------------------------------------------------
// ResizableImage extension — adds a `width` attribute (persisted as inline
// `style="width: …"`, read back on load) and a custom node view that shows a
// drag handle once the image is clicked/selected, letting the width be
// dragged directly instead of only via an attribute panel.
// ---------------------------------------------------------------------------

const IMAGE_MIN_WIDTH = 40;

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.width || element.getAttribute("width") || null,
        renderHTML: (attributes: { width?: string | number | null }) => {
          if (!attributes.width) return {};
          const width = typeof attributes.width === "number" ? `${attributes.width}px` : attributes.width;
          return { style: `width: ${width}` };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }: any) => {
      const wrapper = document.createElement("div");
      wrapper.className = styles.resizableImageWrapper;
      wrapper.contentEditable = "false";

      const img = document.createElement("img");
      wrapper.appendChild(img);

      const handle = document.createElement("span");
      handle.className = styles.resizeHandle;
      wrapper.appendChild(handle);

      const applyAttrs = (attrs: Record<string, any>) => {
        if (attrs.src) img.setAttribute("src", attrs.src);
        else img.removeAttribute("src");
        if (attrs.alt) img.setAttribute("alt", attrs.alt);
        else img.removeAttribute("alt");
        if (attrs.title) img.setAttribute("title", attrs.title);
        else img.removeAttribute("title");
        img.style.width = attrs.width
          ? typeof attrs.width === "number"
            ? `${attrs.width}px`
            : attrs.width
          : "";
      };
      applyAttrs(node.attrs);

      let startX = 0;
      let startWidth = 0;

      const onPointerMove = (e: PointerEvent) => {
        const delta = e.clientX - startX;
        const newWidth = Math.max(IMAGE_MIN_WIDTH, Math.round(startWidth + delta));
        img.style.width = `${newWidth}px`;
      };

      const onPointerUp = () => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        if (typeof getPos !== "function") return;
        const pos = getPos();
        const currentNode = editor.state.doc.nodeAt(pos);
        if (!currentNode) return;
        const finalWidth = Math.round(img.getBoundingClientRect().width);
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, { ...currentNode.attrs, width: finalWidth }),
        );
      };

      handle.addEventListener("pointerdown", (e) => {
        if (!editor.isEditable) return;
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startWidth = img.getBoundingClientRect().width;
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
      });

      return {
        dom: wrapper,
        selectNode() {
          wrapper.classList.add(styles.resizableImageSelected);
        },
        deselectNode() {
          wrapper.classList.remove(styles.resizableImageSelected);
        },
        update(updatedNode: any) {
          if (updatedNode.type.name !== node.type.name) return false;
          applyAttrs(updatedNode.attrs);
          return true;
        },
        stopEvent(event: Event) {
          return event.target === handle;
        },
        ignoreMutation() {
          return true;
        },
        destroy() {
          document.removeEventListener("pointermove", onPointerMove);
          document.removeEventListener("pointerup", onPointerUp);
        },
      };
    };
  },
});

// ---------------------------------------------------------------------------

type ToolbarVariant = "full" | "compact";

const FONT_SIZES = ["10", "12", "13", "14", "16", "18", "20", "24", "28", "32", "36", "48"];
const LINE_HEIGHTS = ["1", "1.15", "1.5", "1.75", "2", "2.5"];

// A bare domain/path (e.g. "example.com") has no scheme, so the browser resolves
// it as relative to the current page instead of as an external URL — normalize it
// to an absolute https:// URL so links actually navigate where the user intended.
const normalizeUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed}`;
};

const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_JPEG_QUALITY = 0.75;
// Content is stored as one JSON string field (see buildTextComponentPayload in
// content-builder-payload.ts) — an uncompressed photo's base64 can be large enough
// to blow past that request's size limit and fail (or get truncated) on save. GIFs
// and SVGs are left untouched since resizing would break animation/vector fidelity.
/** Reads a File as a data URL, downscaling raster images before saving to keep the embedded payload small. */
function readImageFileAsDataUrl(file: File): Promise<string> {
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outputType = file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg";
        resolve(canvas.toDataURL(outputType, IMAGE_JPEG_QUALITY));
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const MenuBar = ({
  editor,
  hideImageButton,
  toolbarVariant = "full",
  showColorPicker = false,
  showFontSize = false,
  showLineHeight = false,
}: {
  editor: any;
  hideImageButton?: boolean;
  toolbarVariant?: ToolbarVariant;
  showColorPicker?: boolean;
  showFontSize?: boolean;
  showLineHeight?: boolean;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, forceToolbarRerender] = useState(0);
  const isCompact = toolbarVariant === "compact";
  const selectedTextColor = editor?.getAttributes("textStyle")?.color;
  const hasActiveColor = Boolean(selectedTextColor);
  const pickerColorValue = selectedTextColor || "#000000";
  const activeFontSize = editor?.getAttributes("textStyle")?.fontSize?.replace("px", "") || "";
  const activeLineHeight =
    editor?.getAttributes("paragraph")?.lineHeight ||
    editor?.getAttributes("heading")?.lineHeight ||
    DEFAULT_LINE_HEIGHT;
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [linkUrlValue, setLinkUrlValue] = useState("");
  const [linkTextValue, setLinkTextValue] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(true);
  const [linkSelectionRange, setLinkSelectionRange] = useState<{ from: number; to: number } | null>(null);
  const [linkCardPos, setLinkCardPos] = useState<{ top: number; left: number } | null>(null);
  const linkButtonRef = useRef<HTMLButtonElement>(null);
  const linkCardRef = useRef<HTMLDivElement>(null);
  const linkUrlInputRef = useRef<HTMLInputElement>(null);

  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const [imageUrlValue, setImageUrlValue] = useState("");
  const [imageCardPos, setImageCardPos] = useState<{ top: number; left: number } | null>(null);
  const imageButtonRef = useRef<HTMLButtonElement>(null);
  const imageCardRef = useRef<HTMLDivElement>(null);
  const imageUrlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLinkPopoverOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (linkCardRef.current?.contains(target) || linkButtonRef.current?.contains(target)) return;
      setIsLinkPopoverOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isLinkPopoverOpen]);

  useEffect(() => {
    if (isLinkPopoverOpen) linkUrlInputRef.current?.focus();
  }, [isLinkPopoverOpen]);

  useEffect(() => {
    if (!isImagePopoverOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (imageCardRef.current?.contains(target) || imageButtonRef.current?.contains(target)) return;
      setIsImagePopoverOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isImagePopoverOpen]);

  useEffect(() => {
    if (isImagePopoverOpen) imageUrlInputRef.current?.focus();
  }, [isImagePopoverOpen]);

  useEffect(() => {
    if (!editor) return;

    const refreshToolbarState = () => {
      forceToolbarRerender((prev) => prev + 1);
    };

    editor.on("selectionUpdate", refreshToolbarState);
    editor.on("transaction", refreshToolbarState);
    editor.on("focus", refreshToolbarState);
    editor.on("blur", refreshToolbarState);

    return () => {
      editor.off("selectionUpdate", refreshToolbarState);
      editor.off("transaction", refreshToolbarState);
      editor.off("focus", refreshToolbarState);
      editor.off("blur", refreshToolbarState);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const LINK_CARD_WIDTH = 320;
  const LINK_CARD_EST_HEIGHT = 300;

  const closeLinkPopover = () => setIsLinkPopoverOpen(false);

  const openLinkPopover = () => {
    let { from, to } = editor.state.selection;
    if (editor.isActive("link") && from === to) {
      // Cursor is just inside a link with nothing selected — expand to the
      // whole link so its full URL/text can be seen and edited.
      editor.chain().extendMarkRange("link").run();
      ({ from, to } = editor.state.selection);
    }
    const linkAttrs = editor.getAttributes("link");
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    setLinkSelectionRange({ from, to });
    setLinkUrlValue(linkAttrs.href || "");
    setLinkTextValue(selectedText);
    setLinkOpenInNewTab(linkAttrs.target ? linkAttrs.target === "_blank" : true);

    // Position the card near the selected text in the content area (not the toolbar).
    const coords = editor.view.coordsAtPos(from);
    let left = coords.left;
    let top = coords.bottom + 8;
    if (typeof window !== "undefined") {
      if (left + LINK_CARD_WIDTH > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - LINK_CARD_WIDTH - 12);
      }
      if (top + LINK_CARD_EST_HEIGHT > window.innerHeight - 12) {
        top = Math.max(12, coords.top - LINK_CARD_EST_HEIGHT - 8);
      }
    }
    setLinkCardPos({ top, left });
    setIsLinkPopoverOpen(true);
  };

  const applyLink = () => {
    if (!linkSelectionRange) return;
    const { from, to } = linkSelectionRange;

    if (!linkUrlValue.trim()) {
      editor.chain().focus().setTextSelection({ from, to }).extendMarkRange("link").unsetLink().run();
      closeLinkPopover();
      return;
    }

    const url = normalizeUrl(linkUrlValue);
    const text = linkTextValue.trim() || url;
    const linkAttrs = { href: url, target: linkOpenInNewTab ? "_blank" : null };

    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, text)
      .setTextSelection({ from, to: from + text.length })
      .setLink(linkAttrs)
      .run();

    closeLinkPopover();
  };

  const removeLink = () => {
    if (!linkSelectionRange) return;
    editor.chain().focus().setTextSelection(linkSelectionRange).extendMarkRange("link").unsetLink().run();
    closeLinkPopover();
  };

  const handleLinkFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyLink();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeLinkPopover();
    }
  };

  const IMAGE_CARD_WIDTH = 320;
  const IMAGE_CARD_EST_HEIGHT = 260;

  const closeImagePopover = () => setIsImagePopoverOpen(false);

  const openImagePopover = () => {
    const rect = imageButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    let left = rect.left;
    let top = rect.bottom + 8;
    if (typeof window !== "undefined") {
      if (left + IMAGE_CARD_WIDTH > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - IMAGE_CARD_WIDTH - 12);
      }
      if (top + IMAGE_CARD_EST_HEIGHT > window.innerHeight - 12) {
        top = Math.max(12, rect.top - IMAGE_CARD_EST_HEIGHT - 8);
      }
    }
    setImageCardPos({ top, left });
    setImageUrlValue("");
    setIsImagePopoverOpen(true);
  };

  const insertImageFromUrl = () => {
    const url = imageUrlValue.trim();
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
    closeImagePopover();
  };

  const triggerImageUpload = () => {
    closeImagePopover();
    fileInputRef.current?.click();
  };

  const handleImageUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      insertImageFromUrl();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeImagePopover();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readImageFileAsDataUrl(file)
      .then((dataUrl) => {
        editor.chain().focus().setImage({ src: dataUrl }).run();
      })
      .catch(() => {
        // Ignore — leaving the editor content unchanged is preferable to inserting a broken image.
      });
  };

  // Prevent editor from losing selection when toolbar buttons are clicked
  const btn = (handler: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    handler();
  };

  return (
    <div className={styles.toolbar}>
      {/* History */}
      <div className={styles.toolbarGroup}>
        <button
          onMouseDown={btn(() => editor.chain().focus().undo().run())}
          disabled={!editor.can().chain().focus().undo().run()}
          className={styles.toolbarBtn}
          title="Undo"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7v6h6"></path>
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
          </svg>
        </button>
        <button
          onMouseDown={btn(() => editor.chain().focus().redo().run())}
          disabled={!editor.can().chain().focus().redo().run()}
          className={styles.toolbarBtn}
          title="Redo"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 7v6h-6"></path>
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l2.7 2.7"></path>
          </svg>
        </button>
      </div>

      {/* Blocks */}
      <div className={styles.toolbarGroup}>
        {!isCompact && (
          <button
            onMouseDown={btn(() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            )}
            className={`${styles.toolbarBtn} ${editor.isActive("heading", { level: 2 }) ? styles.active : ""}`}
            title="Heading"
          >
            H
          </button>
        )}
        <button
          onMouseDown={btn(() => editor.chain().focus().toggleBulletList().run())}
          className={`${styles.toolbarBtn} ${editor.isActive("bulletList") ? styles.active : ""}`}
          title="Bullet List"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
        <button
          onMouseDown={btn(() => editor.chain().focus().toggleOrderedList().run())}
          className={`${styles.toolbarBtn} ${editor.isActive("orderedList") ? styles.active : ""}`}
          title="Ordered List"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="10" y1="6" x2="21" y2="6"></line>
            <line x1="10" y1="12" x2="21" y2="12"></line>
            <line x1="10" y1="18" x2="21" y2="18"></line>
            <path d="M4 6h1v4"></path>
            <path d="M4 10h2"></path>
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
          </svg>
        </button>
      </div>

      {/* Format */}
      <div className={styles.toolbarGroup}>
        <button
          onMouseDown={btn(() => editor.chain().focus().toggleBold().run())}
          className={`${styles.toolbarBtn} ${editor.isActive("bold") ? styles.active : ""}`}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          onMouseDown={btn(() => editor.chain().focus().toggleItalic().run())}
          className={`${styles.toolbarBtn} ${editor.isActive("italic") ? styles.active : ""}`}
          title="Italic"
        >
          <em>I</em>
        </button>
        {!isCompact && (
          <>
            <button
              onMouseDown={btn(() => editor.chain().focus().toggleStrike().run())}
              className={`${styles.toolbarBtn} ${editor.isActive("strike") ? styles.active : ""}`}
              title="Strikethrough"
            >
              <s>S</s>
            </button>
            <button
              onMouseDown={btn(() => editor.chain().focus().toggleCode().run())}
              className={`${styles.toolbarBtn} ${editor.isActive("code") ? styles.active : ""}`}
              title="Code"
            >
              {"</>"}
            </button>
          </>
        )}
        <button
          onMouseDown={btn(() => editor.chain().focus().toggleUnderline().run())}
          className={`${styles.toolbarBtn} ${editor.isActive("underline") ? styles.active : ""}`}
          title="Underline"
        >
          <u>U</u>
        </button>
        <button
          ref={linkButtonRef}
          onMouseDown={btn(() => (isLinkPopoverOpen ? closeLinkPopover() : openLinkPopover()))}
          className={`${styles.toolbarBtn} ${editor.isActive("link") ? styles.active : ""}`}
          title="Link"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3"></path>
            <path d="M9 17H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"></path>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </button>
        {isLinkPopoverOpen && linkCardPos && typeof document !== "undefined" && createPortal(
          <div
            ref={linkCardRef}
            className={styles.linkCard}
            style={{ top: linkCardPos.top, left: linkCardPos.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.linkCardField}>
              <label className={styles.linkCardLabel} htmlFor="rte-link-url">Url</label>
              <input
                id="rte-link-url"
                ref={linkUrlInputRef}
                type="text"
                value={linkUrlValue}
                onChange={(e) => setLinkUrlValue(e.target.value)}
                onKeyDown={handleLinkFieldKeyDown}
                placeholder="https://example.com"
                className={styles.linkCardInput}
              />
            </div>
            <div className={styles.linkCardField}>
              <label className={styles.linkCardLabel} htmlFor="rte-link-text">Text</label>
              <input
                id="rte-link-text"
                type="text"
                value={linkTextValue}
                onChange={(e) => setLinkTextValue(e.target.value)}
                onKeyDown={handleLinkFieldKeyDown}
                placeholder="Link text"
                className={styles.linkCardInput}
              />
            </div>
            <label className={styles.linkCardCheckboxRow}>
              <input
                type="checkbox"
                checked={linkOpenInNewTab}
                onChange={(e) => setLinkOpenInNewTab(e.target.checked)}
                className={styles.linkCardCheckbox}
              />
              Open in new tab
            </label>
            <div className={styles.linkCardDivider} />
            <div className={styles.linkCardActions}>
              {editor.isActive("link") && (
                <button type="button" onClick={removeLink} className={styles.linkCardRemove}>
                  Remove link
                </button>
              )}
              <button
                type="button"
                onClick={closeLinkPopover}
                className={`${styles.linkCardBtn} ${styles.linkCardCancel}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyLink}
                className={`${styles.linkCardBtn} ${styles.linkCardInsert}`}
              >
                Insert
              </button>
            </div>
          </div>,
          document.body,
        )}
        {showColorPicker && (
          <label
            className={`${styles.toolbarBtn} ${styles.colorPickerBtn} ${hasActiveColor ? styles.colorPickerActive : ""}`}
            title="Text Color"
            aria-label="Text Color"
            style={hasActiveColor ? { color: selectedTextColor } : undefined}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.3 11.7 9.25 2.65a1 1 0 0 0-1.42 0L6.42 4.06a1 1 0 0 0 0 1.41L11 10 6 15h8.5a1 1 0 0 0 .7-.3l3.1-3.1a1 1 0 0 0 0-1.4ZM12.9 13H8.4l4-4 2.2 2.2Z" />
              <path d="M18.5 14.5a2 2 0 0 0-2 2c0 1.3 2 3.5 2 3.5s2-2.2 2-3.5a2 2 0 0 0-2-2Z" />
              <path d="M4 20h12v2H4z" />
            </svg>
            <input
              type="color"
              value={pickerColorValue}
              onChange={(e) =>
                editor.chain().focus().setColor(e.target.value).run()
              }
              className={styles.colorInput}
              aria-label="Text Color Picker"
            />
          </label>
        )}
      </div>

      {/* Font size */}
      {showFontSize && (
        <div className={styles.toolbarGroup}>
          <select
            className={styles.fontSizeSelect}
            value={activeFontSize}
            title="Font Size"
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                editor.chain().focus().setFontSize(`${val}px`).run();
              } else {
                editor.chain().focus().unsetFontSize().run();
              }
            }}
          >
            <option value="">Size</option>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Line height */}
      {showLineHeight && (
        <div className={styles.toolbarGroup}>
          <select
            className={`${styles.fontSizeSelect} ${styles.lineHeightSelect}`}
            value={activeLineHeight}
            title="Line Height"
            onChange={(e) => editor.chain().focus().setLineHeight(e.target.value).run()}
          >
            {LINE_HEIGHTS.map((lh) => (
              <option key={lh} value={lh}>
                {lh}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isCompact && (
        <>
          {/* Script */}
          <div className={styles.toolbarGroup}>
            <button
              onMouseDown={btn(() => editor.chain().focus().toggleSubscript().run())}
              className={`${styles.toolbarBtn} ${editor.isActive("subscript") ? styles.active : ""}`}
              title="Subscript"
            >
              x₂
            </button>
            <button
              onMouseDown={btn(() => editor.chain().focus().toggleSuperscript().run())}
              className={`${styles.toolbarBtn} ${editor.isActive("superscript") ? styles.active : ""}`}
              title="Superscript"
            >
              x²
            </button>
          </div>

          {/* Align */}
          <div className={styles.toolbarGroup}>
            <button
              onMouseDown={btn(() => editor.chain().focus().setTextAlign("left").run())}
              className={`${styles.toolbarBtn} ${editor.isActive({ textAlign: "left" }) ? styles.active : ""}`}
              title="Left"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="17" y1="10" x2="3" y2="10"></line>
                <line x1="21" y1="6" x2="3" y2="6"></line>
                <line x1="21" y1="14" x2="3" y2="14"></line>
                <line x1="17" y1="18" x2="3" y2="18"></line>
              </svg>
            </button>
            <button
              onMouseDown={btn(() =>
                editor.chain().focus().setTextAlign("center").run()
              )}
              className={`${styles.toolbarBtn} ${editor.isActive({ textAlign: "center" }) ? styles.active : ""}`}
              title="Center"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="21" y1="6" x2="3" y2="6"></line>
                <line x1="17" y1="10" x2="7" y2="10"></line>
                <line x1="19" y1="14" x2="5" y2="14"></line>
                <line x1="21" y1="18" x2="3" y2="18"></line>
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Add */}
      {!hideImageButton && !isCompact && (
        <div className={styles.toolbarGroup}>
          <button
            ref={imageButtonRef}
            onMouseDown={btn(() => (isImagePopoverOpen ? closeImagePopover() : openImagePopover()))}
            className={`${styles.toolbarBtn} ${styles.addBtn}`}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            Add
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleFileChange}
          />
          {isImagePopoverOpen && imageCardPos && typeof document !== "undefined" && createPortal(
            <div
              ref={imageCardRef}
              className={styles.linkCard}
              style={{ top: imageCardPos.top, left: imageCardPos.left }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={styles.linkCardField} style={{ marginBottom: 12 }}>
                <label className={styles.linkCardLabel} htmlFor="rte-image-url">Image URL</label>
                <input
                  id="rte-image-url"
                  ref={imageUrlInputRef}
                  type="text"
                  value={imageUrlValue}
                  onChange={(e) => setImageUrlValue(e.target.value)}
                  onKeyDown={handleImageUrlKeyDown}
                  placeholder="https://example.com/image.png"
                  className={styles.linkCardInput}
                />
              </div>
              <button
                type="button"
                onClick={insertImageFromUrl}
                className={`${styles.linkCardBtn} ${styles.linkCardInsert} ${styles.imageFullWidthBtn}`}
                disabled={!imageUrlValue.trim()}
              >
                Insert from URL
              </button>

              <div className={styles.imageCardDivider}>
                <span>or</span>
              </div>

              <button
                type="button"
                onClick={triggerImageUpload}
                className={`${styles.imageUploadBtn} ${styles.imageFullWidthBtn}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload from device
              </button>

              <div className={styles.linkCardDivider} />
              <div className={styles.linkCardActions}>
                <button
                  type="button"
                  onClick={closeImagePopover}
                  className={`${styles.linkCardBtn} ${styles.linkCardCancel}`}
                >
                  Cancel
                </button>
              </div>
            </div>,
            document.body,
          )}
        </div>
      )}
    </div>
  );
};

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Type here...",
  hideImageButton = false,
  toolbarVariant = "full",
  showColorPicker = false,
  showFontSize = false,
  showLineHeight = false,
  showToolbar = true,
  editable = true,
  minHeight,
  contentFontSize,
}: {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  hideImageButton?: boolean;
  toolbarVariant?: ToolbarVariant;
  showColorPicker?: boolean;
  showFontSize?: boolean;
  showLineHeight?: boolean;
  showToolbar?: boolean;
  editable?: boolean;
  minHeight?: string;
  contentFontSize?: string;
}) {
  const editor = useEditor({
    editable,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: !editable,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow" },
      }),
      TextStyle,
      ...(showColorPicker ? [Color] : []),
      ...(showFontSize ? [FontSize] : []),
      ...(showLineHeight ? [LineHeight] : []),
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      ResizableImage.configure({
        // Uploaded images are embedded as base64 data URIs (see readImageFileAsDataUrl
        // above) — without this, tiptap's parse rule excludes `img[src^="data:"]`
        // entirely, so a saved base64 image silently disappears when content reloads.
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `${styles.editorContent} tiptap-editor-prose`,
        ...(contentFontSize ? { style: `font-size: ${contentFontSize}` } : {}),
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && content !== undefined && content !== editor.getHTML()) {
      // `setContent` defaults to `emitUpdate: true` in Tiptap 3, which fires `onUpdate`
      // (and thus `onChange`) as if the user had typed. This effect only exists to keep
      // the editor in sync with an externally-controlled `content` prop — most commonly
      // right after mount, when the saved HTML almost never round-trips byte-for-byte
      // through Tiptap's own serializer (attribute order, self-closing tags, whitespace,
      // …). Emitting an update there rewrites the caller's state with zero real edits,
      // which falsely marked content as "changed" the moment it was opened. Passing
      // `emitUpdate: false` makes this a pure display sync, never a synthetic edit.
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    // `setEditable`'s second argument defaults to `true` and, unlike a real content
    // edit, emits "update" unconditionally — even when the doc didn't change at all.
    // This effect runs on every mount (editor goes from null to an instance) as well
    // as whenever `editable` changes, so leaving it at the default fired a synthetic
    // `onChange` the moment any component was merely opened, with zero real edits.
    if (editor) editor.setEditable(editable, false);
  }, [editor, editable]);

  return (
    <div className={styles.editorContainer} style={minHeight ? { minHeight } : undefined}>
      {showToolbar && (
        <MenuBar
          editor={editor}
          hideImageButton={hideImageButton}
          toolbarVariant={toolbarVariant}
          showColorPicker={showColorPicker}
          showFontSize={showFontSize}
          showLineHeight={showLineHeight}
        />
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
