'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Heading from '@tiptap/extension-heading';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import {
  Bold as BoldIcon,
  Heading1,
  Heading2,
  Heading3,
  Underline as UnderlineIcon,
  Palette
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useCallback } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

const colors = [
  { name: 'Default', value: 'inherit' },
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#ff0000' },
  { name: 'Green', value: '#00ff00' },
  { name: 'Blue', value: '#0000ff' },
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Orange', value: '#ff9900' },
];

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 border-b">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('bold') && "bg-accent text-accent-foreground"
        )}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('underline') && "bg-accent text-accent-foreground"
        )}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('heading', { level: 1 }) && "bg-accent text-accent-foreground"
        )}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('heading', { level: 2 }) && "bg-accent text-accent-foreground"
        )}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('heading', { level: 3 }) && "bg-accent text-accent-foreground"
        )}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {colors.map((color) => (
            <DropdownMenuItem
              key={color.value}
              onClick={() => editor.chain().focus().setColor(color.value).run()}
              className="flex items-center gap-2"
            >
              <div
                className="h-4 w-4 rounded-full border"
                style={{ backgroundColor: color.value === 'inherit' ? 'transparent' : color.value }}
              />
              <span>{color.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export function RichTextEditor({ content, onChange, onSubmit, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Bold,
      Underline,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  const addTimeStampedNote = useCallback(() => {
    if (!editor) return;

    const now = new Date();
    const timestamp = now.toLocaleString();

    // Get current content
    const currentContent = editor.getHTML();

    // Add timestamp to the end of the content
    const updatedContent = currentContent + (currentContent ? '<p>' : '') + `<strong>${timestamp}:</strong> ` + (currentContent ? '</p>' : '');

    // Set the updated content
    editor.commands.setContent(updatedContent);

    // Trigger the onChange callback with the updated content
    onChange(updatedContent);
  }, [editor, onChange]);

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="min-h-[200px]" />
      <div className="p-2 border-t flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            addTimeStampedNote();
            if (onSubmit) {
              onSubmit();
            }
          }}
        >
          Add Note
        </Button>
      </div>
    </div>
  );
}
