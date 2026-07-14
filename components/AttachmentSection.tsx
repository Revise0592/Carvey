"use client";

import { Paperclip, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { RecordAttachment } from "@/lib/db";

export function AttachmentSection({
  attachments,
  vehicleId,
  recordType,
  recordId,
  deleteAction
}: {
  attachments: RecordAttachment[];
  vehicleId: number;
  recordType: string;
  recordId: number;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="attachment-section" id={`attachments-${recordType}-${recordId}`}>
      {attachments.length > 0 ? (
        <div className="attachment-list">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="attachment-row">
              <a
                href={attachment.filePath}
                download={attachment.originalFilename}
                className="attachment-link"
                title={attachment.originalFilename}
              >
                <Paperclip size={13} />
                <span>{attachment.originalFilename}</span>
              </a>
              <form action={deleteAction}>
                <input type="hidden" name="attachmentId" value={attachment.id} />
                <button
                  type="submit"
                  className="icon-button"
                  aria-label={`Delete ${attachment.originalFilename}`}
                  title="Delete attachment"
                >
                  <Trash2 size={13} />
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : null}
      <form
        ref={formRef}
        action={`/api/attachments`}
        method="post"
        encType="multipart/form-data"
        className="attachment-upload"
      >
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <input type="hidden" name="recordType" value={recordType} />
        <input type="hidden" name="recordId" value={recordId} />
        <label className="file-button file-button-small">
          <Upload size={13} />
          <span>{uploading ? "Uploading..." : "Attach file"}</span>
          <input
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,text/plain"
            disabled={uploading}
            onChange={(event) => {
              if (!event.currentTarget.files?.length) return;
              setUploading(true);
              formRef.current?.requestSubmit();
            }}
          />
        </label>
      </form>
    </div>
  );
}
