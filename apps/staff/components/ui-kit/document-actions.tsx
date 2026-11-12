"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import {
  DownloadIcon,
  MailIcon,
  MessageCircleIcon,
  PrinterIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Field, FieldGroup } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import {
  FieldHint,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { useSession } from "@/components/session"
import { api } from "@/lib/api"
import { notifyError, notifySuccess } from "@/lib/notify"

// Same rule as the server (api/v1/printing.py pdf_options): A4 carries our letterhead,
// receipts are printed without it.
const LETTER_HEAD = "Adeel Traders"

function pdfUrl(
  doctype: string,
  name: string,
  format: string,
  receipt: boolean
) {
  const q = new URLSearchParams({ doctype, name, format })
  if (receipt) q.set("no_letterhead", "1")
  else q.set("letterhead", LETTER_HEAD)
  return `/api/method/frappe.utils.print_format.download_pdf?${q}`
}

/**
 * Print / PDF / Email / WhatsApp for one document (P1.8). Every action goes through Frappe's
 * print engine and its permission check; the layout is the server's print format.
 */
export function DocumentActions({
  doctype,
  name,
  title,
  format,
  receipt = false,
  canEmail = false,
}: {
  doctype: string
  name: string
  /** Words for the email subject and the WhatsApp message. */
  title: string
  /** Print Format name, e.g. "Stock Count Sheet". */
  format: string
  /** 80 mm receipt: no letterhead. */
  receipt?: boolean
  /** The server says this person may email the document (Frappe "email" permission). */
  canEmail?: boolean
}) {
  const url = pdfUrl(doctype, name, format, receipt)
  // Email only when the person may email it AND an email account can send it (no dead button).
  const { email_ready } = useSession()
  const showEmail = canEmail && email_ready
  const [emailing, setEmailing] = React.useState(false)
  const share = useMutation({
    mutationFn: async () => {
      // 1. Phones and tablets (touch screens) hand the PDF file itself to WhatsApp through their
      // share sheet. A computer's share menu (AirDrop, Mail...) has no WhatsApp, so it uses the link.
      if (window.matchMedia("(pointer: coarse)").matches) {
        try {
          const res = await fetch(url, { credentials: "same-origin" })
          if (res.ok && res.headers.get("content-type")?.includes("pdf")) {
            const file = new File([await res.blob()], `${name}.pdf`, {
              type: "application/pdf",
            })
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], title, text: title })
              return "file"
            }
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError")
            return "closed"
          // anything else (for example the browser wants a fresh tap): use the link instead
        }
      }
      // 2. Everyone else: a message with a link to the PDF, which works for 7 days.
      const { url: link, expires_on } = await api.shareLink(
        doctype,
        name,
        format
      )
      const until = new Date(expires_on).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      const text = `${title}\nPDF, link works until ${until}:\n${link}`
      // No "noopener" here: it hides whether the browser blocked the tab. We cut the tie ourselves.
      const tab = window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank"
      )
      if (tab) {
        tab.opener = null
      } else {
        // The browser blocked the new tab: keep the message so nothing is lost.
        await navigator.clipboard?.writeText(text).catch(() => undefined)
        notifySuccess(
          "Your browser blocked the WhatsApp tab",
          "The message is copied. Open WhatsApp and paste it."
        )
      }
      return "link"
    },
    onError: (e) => notifyError(e, "Couldn't share it"),
  })
  return (
    <>
      <Button
        variant="outline"
        className="max-md:h-10"
        nativeButton={false}
        render={<a href={url} target="_blank" rel="noopener" />}
      >
        <PrinterIcon data-icon="inline-start" />
        Open PDF to print
      </Button>
      <Button
        variant="outline"
        className="max-md:h-10"
        nativeButton={false}
        render={<a href={url} download={`${name}.pdf`} />}
      >
        <DownloadIcon data-icon="inline-start" />
        Download PDF
      </Button>
      {showEmail && (
        <Button
          variant="outline"
          className="max-md:h-10"
          onClick={() => setEmailing(true)}
        >
          <MailIcon data-icon="inline-start" />
          Email PDF
        </Button>
      )}
      <Button
        variant="outline"
        className="max-md:h-10"
        onClick={() => share.mutate()}
        disabled={share.isPending}
      >
        {share.isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <MessageCircleIcon
            data-icon="inline-start"
            className="text-chart-4"
          />
        )}
        WhatsApp
      </Button>
      <EmailDialog
        open={emailing}
        onOpenChange={setEmailing}
        doctype={doctype}
        name={name}
        title={title}
        format={format}
        receipt={receipt}
      />
    </>
  )
}

function EmailDialog({
  open,
  onOpenChange,
  doctype,
  name,
  title,
  format,
  receipt,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype: string
  name: string
  title: string
  format: string
  receipt: boolean
}) {
  const [to, setTo] = React.useState("")
  const [subject, setSubject] = React.useState(title)
  const [message, setMessage] = React.useState(`Please find ${title} attached.`)
  const check = useFormCheck({
    em_to: !/^\S+@\S+\.\S+(\s*,\s*\S+@\S+\.\S+)*$/.test(to.trim())
      ? "Enter an email address, or several separated by commas."
      : undefined,
    em_subject: !subject.trim() ? "Write a subject." : undefined,
  })
  const send = useMutation({
    mutationFn: () =>
      api.emailDocument({
        doctype,
        name,
        recipients: to.trim(),
        subject: subject.trim(),
        content: message.replace(/\n/g, "<br>"),
        print_format: format,
        print_letterhead: !receipt,
        letterhead: receipt ? undefined : LETTER_HEAD,
      }),
    onSuccess: () => {
      notifySuccess("Email queued with the PDF")
      onOpenChange(false)
      check.reset()
    },
    onError: (e) => notifyError(e, "Couldn't send the email"),
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email {title}</DialogTitle>
          <DialogDescription>
            The PDF of this document is attached to the email.
          </DialogDescription>
        </DialogHeader>
        <form
          id="email-doc-form"
          noValidate
          onSubmit={(e) => check.submit(e, () => send.mutate())}
        >
          <FieldGroup>
            <Field data-invalid={check.invalid("em_to")}>
              <RequiredLabel htmlFor="em_to">To</RequiredLabel>
              <Input
                id="em_to"
                type="email"
                multiple
                value={to}
                placeholder="customer@example.com"
                onChange={(e) => setTo(e.target.value)}
                aria-invalid={check.invalid("em_to")}
              />
              <FieldHint error={check.error("em_to")} />
            </Field>
            <Field data-invalid={check.invalid("em_subject")}>
              <RequiredLabel htmlFor="em_subject">Subject</RequiredLabel>
              <Input
                id="em_subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                aria-invalid={check.invalid("em_subject")}
              />
              <FieldHint error={check.error("em_subject")} />
            </Field>
            <Field>
              <RequiredLabel htmlFor="em_message">Message</RequiredLabel>
              <Textarea
                id="em_message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-24"
              />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="email-doc-form" disabled={send.isPending}>
            {send.isPending && <Spinner data-icon="inline-start" />}
            Send email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
