"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { CameraIcon } from "lucide-react"

import { Spinner } from "@workspace/ui/components/spinner"

import { ProductThumb } from "@/components/products/bits"
import { api, type ProductDetail } from "@/lib/api"
import { uploadFile } from "@/lib/frappe"
import { notifyError, notifySuccess } from "@/lib/notify"

const MAX_BYTES = 5 * 1024 * 1024

/**
 * The product's photo (or its letters). People who can edit the product click it to upload
 * or replace the photo; the file goes through Frappe's standard upload, attached to the Item.
 */
export function ProductPhoto({ product }: { product: ProductDetail }) {
  const queryClient = useQueryClient()
  const input = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const thumb = (
    <ProductThumb
      name={product.item_name}
      group={product.item_group}
      image={product.image}
      size="lg"
    />
  )
  if (!product.can.edit_product) return thumb

  async function onFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      notifyError(new Error("Choose a photo (JPG, PNG or WebP)."))
      return
    }
    if (file.size > MAX_BYTES) {
      notifyError(
        new Error("The photo is larger than 5 MB. Choose a smaller one.")
      )
      return
    }
    setBusy(true)
    try {
      const uploaded = await uploadFile(file, {
        doctype: "Item",
        name: product.item_code,
      })
      await api.setProductImage(product.item_code, uploaded.file_url)
      notifySuccess("Photo saved")
      queryClient.invalidateQueries({
        queryKey: ["product", product.item_code],
      })
      queryClient.invalidateQueries({ queryKey: ["products"] })
    } catch (e) {
      notifyError(e, "Couldn't save the photo")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      disabled={busy}
      aria-label={product.image ? "Replace the photo" : "Add a photo"}
      title={product.image ? "Replace the photo" : "Add a photo"}
      className="group relative shrink-0 rounded-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {thumb}
      <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {busy ? <Spinner /> : <CameraIcon className="size-5" />}
      </span>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </button>
  )
}
