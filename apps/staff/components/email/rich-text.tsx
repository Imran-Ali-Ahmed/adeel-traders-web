"use client"

import * as React from "react"
import { Node } from "@tiptap/core"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  BoldIcon,
  Heading2Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  PlusIcon,
  Redo2Icon,
  SearchIcon,
  Undo2Icon,
} from "lucide-react"
import type { Editor } from "@tiptap/react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import {
  humanize,
  toEditorHtml,
  toStoredHtml,
  type Insertable,
} from "@/lib/email-template"

import "./email-editor.css"

/** A piece of information filled in when the email is sent. Shown as a chip, stored as {{ key }}. */
const Variable = Node.create({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { key: { default: "" }, label: { default: "" } }
  },
  parseHTML() {
    return [
      {
        tag: "span[data-var]",
        getAttrs: (el) => ({
          key: (el as HTMLElement).getAttribute("data-var"),
          label: (el as HTMLElement).textContent,
        }),
      },
    ]
  },
  renderHTML({ node }) {
    return ["span", { "data-var": node.attrs.key }, node.attrs.label]
  },
  renderText({ node }) {
    return `{{ ${node.attrs.key} }}`
  },
})

const escapeHtml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the cursor in the text
      onClick={onClick}
      className={cn(active && "bg-muted text-foreground")}
    >
      {children}
    </Button>
  )
}

/** Pick a piece of information to put in the text: searchable, most used first. */
function InsertInfoDialog({
  open,
  onOpenChange,
  items,
  onPick,
  hasType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Insertable[]
  onPick: (item: Insertable) => void
  hasType: boolean
}) {
  const [query, setQuery] = React.useState("")
  React.useEffect(() => {
    if (open) setQuery("")
  }, [open])
  const q = query.trim().toLowerCase()
  const shown = items.filter((i) => !q || i.label.toLowerCase().includes(q))
  const group = (common: boolean) => shown.filter((i) => i.common === common)
  const List = ({ title, rows }: { title: string; rows: Insertable[] }) =>
    rows.length === 0 ? null : (
      <div className="flex flex-col gap-1">
        <span className="px-1 text-xs font-medium text-muted-foreground">
          {title}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {rows.map((i) => (
            <button
              key={i.key}
              type="button"
              onClick={() => onPick(i)}
              className="cursor-pointer rounded-md bg-primary/10 px-2 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>
    )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add information from the order</DialogTitle>
          <DialogDescription>
            Pick what to put in the text. It is filled in with the real details
            when the email is sent.
          </DialogDescription>
        </DialogHeader>
        {!hasType ? (
          <p className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
            First choose what this email is for, at the top. Then you can pick
            from its details here.
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
            The list is not available to you right now.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search, for example “phone”"
                aria-label="Search information"
                className="pl-8"
              />
            </div>
            <div className="flex max-h-72 flex-col gap-4 overflow-y-auto pr-1">
              <List title="Most used" rows={group(true)} />
              <List title="Everything else" rows={group(false)} />
              {shown.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nothing matches “{query}”.
                </p>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LinkDialog({
  open,
  onOpenChange,
  onApply,
  onRemove,
  hasLink,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (url: string) => void
  onRemove: () => void
  hasLink: boolean
}) {
  const [url, setUrl] = React.useState("https://")
  React.useEffect(() => {
    if (open) setUrl("https://")
  }, [open])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link</DialogTitle>
          <DialogDescription>
            The selected words become a link to this web address.
          </DialogDescription>
        </DialogHeader>
        <form
          id="link-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (url.trim() && url.trim() !== "https://") onApply(url.trim())
          }}
        >
          <Input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Web address"
          />
        </form>
        <DialogFooter>
          {hasLink && (
            <Button variant="outline" onClick={onRemove}>
              Remove link
            </Button>
          )}
          <Button type="submit" form="link-form">
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The editor for email text and subjects. People see ordinary text and blue "information" chips
 * (Customer name, Total amount); Frappe stores {{ customer_name }}. No code is ever shown.
 * `value` is the stored text; `onChange` gives the stored text back.
 */
export function RichText({
  variant,
  value,
  onChange,
  items,
  hasType,
  invalid,
  ariaLabel,
  placeholder,
  id,
}: {
  variant: "body" | "line"
  value: string
  onChange: (stored: string) => void
  items: Insertable[]
  /** A document type is chosen (otherwise "Add information" explains what to do first). */
  hasType: boolean
  invalid?: boolean
  ariaLabel: string
  placeholder?: string
  id?: string
}) {
  const labelOf = React.useCallback(
    (key: string) => items.find((i) => i.key === key)?.label ?? humanize(key),
    [items]
  )
  const [pickingInfo, setPickingInfo] = React.useState(false)
  const [pickingLink, setPickingLink] = React.useState(false)
  const line = variant === "line"

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure(
        line
          ? {
              heading: false,
              bulletList: false,
              orderedList: false,
              listItem: false,
              blockquote: false,
              codeBlock: false,
              code: false,
              horizontalRule: false,
              bold: false,
              italic: false,
              strike: false,
              underline: false,
              link: false,
              hardBreak: false,
            }
          : {
              heading: { levels: [2] },
              blockquote: false,
              codeBlock: false,
              code: false,
              horizontalRule: false,
              strike: false,
              underline: false,
              link: { openOnClick: false },
            }
      ),
      Variable,
    ],
    content: line
      ? `<p>${toEditorHtml(escapeHtml(value), labelOf)}</p>`
      : toEditorHtml(value, labelOf),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: "textbox",
        "aria-label": ariaLabel,
        "aria-multiline": line ? "false" : "true",
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
      handleKeyDown: line
        ? (_view, event) => event.key === "Enter" // a subject is one line
        : undefined,
    },
    onUpdate: ({ editor: e }) =>
      onChange(line ? e.getText() : toStoredHtml(e.getHTML())),
  })

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      heading: e?.isActive("heading", { level: 2 }) ?? false,
      bullet: e?.isActive("bulletList") ?? false,
      ordered: e?.isActive("orderedList") ?? false,
      link: e?.isActive("link") ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  })

  const insert = (item: Insertable) => {
    editor
      ?.chain()
      .focus()
      .insertContent([
        { type: "variable", attrs: { key: item.key, label: item.label } },
        { type: "text", text: " " },
      ])
      .run()
    setPickingInfo(false)
  }
  const run = (fn: (e: Editor) => void) => editor && fn(editor)

  const infoButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => setPickingInfo(true)}
    >
      <PlusIcon data-icon="inline-start" />
      Add information
    </Button>
  )

  return (
    <div
      className={cn(
        "email-editor flex flex-col rounded-lg border bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        line && "is-line",
        invalid && "border-destructive ring-3 ring-destructive/20"
      )}
    >
      {line ? (
        <div className="flex items-center gap-2 pr-1.5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <EditorContent editor={editor} />
          </div>
          {infoButton}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-1.5 py-1">
            <ToolButton
              label="Bold"
              active={state?.bold}
              onClick={() => run((e) => e.chain().focus().toggleBold().run())}
            >
              <BoldIcon />
            </ToolButton>
            <ToolButton
              label="Italic"
              active={state?.italic}
              onClick={() => run((e) => e.chain().focus().toggleItalic().run())}
            >
              <ItalicIcon />
            </ToolButton>
            <ToolButton
              label="Heading"
              active={state?.heading}
              onClick={() =>
                run((e) => e.chain().focus().toggleHeading({ level: 2 }).run())
              }
            >
              <Heading2Icon />
            </ToolButton>
            <ToolButton
              label="Bulleted list"
              active={state?.bullet}
              onClick={() =>
                run((e) => e.chain().focus().toggleBulletList().run())
              }
            >
              <ListIcon />
            </ToolButton>
            <ToolButton
              label="Numbered list"
              active={state?.ordered}
              onClick={() =>
                run((e) => e.chain().focus().toggleOrderedList().run())
              }
            >
              <ListOrderedIcon />
            </ToolButton>
            <ToolButton
              label="Link"
              active={state?.link}
              onClick={() => setPickingLink(true)}
            >
              <LinkIcon />
            </ToolButton>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <ToolButton
              label="Undo"
              disabled={!state?.canUndo}
              onClick={() => run((e) => e.chain().focus().undo().run())}
            >
              <Undo2Icon />
            </ToolButton>
            <ToolButton
              label="Redo"
              disabled={!state?.canRedo}
              onClick={() => run((e) => e.chain().focus().redo().run())}
            >
              <Redo2Icon />
            </ToolButton>
            <span className="ml-auto">{infoButton}</span>
          </div>
          <EditorContent editor={editor} />
        </>
      )}

      <InsertInfoDialog
        open={pickingInfo}
        onOpenChange={setPickingInfo}
        items={items}
        hasType={hasType}
        onPick={insert}
      />
      <LinkDialog
        open={pickingLink}
        onOpenChange={setPickingLink}
        hasLink={Boolean(state?.link)}
        onApply={(url) => {
          run((e) =>
            e
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: url })
              .run()
          )
          setPickingLink(false)
        }}
        onRemove={() => {
          run((e) =>
            e.chain().focus().extendMarkRange("link").unsetLink().run()
          )
          setPickingLink(false)
        }}
      />
    </div>
  )
}
