import { toast } from "@workspace/ui/components/toast"

export function notifySuccess(title: string, description?: string) {
  toast.add({ title, description, type: "success" })
}

export function notifyError(error: unknown, title = "Couldn't save") {
  toast.add({
    title,
    description: error instanceof Error ? error.message : String(error),
    type: "error",
  })
}
